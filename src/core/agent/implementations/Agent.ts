import { randomUUID } from 'crypto'
import { getErrorMessage } from '@core/utils'
import { CONTENT_TYPE, Message, MESSAGE_ROLE, Tool } from '@provider'
import { AgentBudgetError, BudgetFactory, BudgetInterface } from '../budget'
import { AgentConfigError, AgentError, AgentUnexpectedError } from '../errors'
import {
    AgentGuardrailDecisionRequiredError,
    AgentGuardrailError,
    GUARDRAIL_ACTION,
    GUARDRAIL_CHECK_MODE,
    GUARDRAIL_REQUEST_DECISION,
    GuardrailCheckMode,
    GuardrailCheckResult,
    GuardrailEvent,
    GuardrailInterface,
    GuardrailResolverInterface,
    GuardrailRunPolicy
} from '@guardrail'
import { AgentInterface } from '../interfaces'
import { MemoryInterface } from '@memory'
import { ObservabilityInterface, OBSERVABILITY_EVENT_TYPE, OBSERVABILITY_SPAN_TYPE } from '@observability'
import { buildAgentIdentityPrompt, buildBasePrompt, buildDateTimePrompt, buildWorkingDirectoryPrompt } from '../prompts'
import { AgentSessionError, SESSION_STATUS, SessionInterface } from '@session'
import { StructuredOutputExtractorInterface } from '../structured/interfaces'
import { GenerateOptions, STRATEGY_DECISION } from '@strategy'
import { ToolCall, ToolInterface, ToolResult } from '@tool'
import { ToolOrchestratorInterface } from '../toolOrchestrator'
import { AGENT_EVENT_TYPE, AgentConfig, AgentDependencies, AgentEvent, AgentRunOptions, ForcedToolCall } from '../types'

export class Agent implements AgentInterface {
    private readonly toolOrchestrator: ToolOrchestratorInterface
    private readonly guardrails: Array<GuardrailInterface>
    private readonly guardrailResolver: GuardrailResolverInterface
    private readonly observability: ObservabilityInterface
    private readonly structuredOutputExtractor: StructuredOutputExtractorInterface
    private readonly memory: MemoryInterface
    private readonly budgetFactory: BudgetFactory

    private readonly abortControllers = new Map<string, AbortController>()

    private _config: AgentConfig

    get config(): AgentConfig {
        return this._config
    }

    constructor(config: AgentConfig, dependencies: AgentDependencies) {
        this.validateConfig(config)

        this._config = config
        this.toolOrchestrator = dependencies.toolOrchestrator
        this.guardrails = dependencies.guardrails
        this.guardrailResolver = dependencies.guardrailResolver
        this.observability = dependencies.observability
        this.structuredOutputExtractor = dependencies.structuredOutputExtractor
        this.memory = dependencies.memory
        this.budgetFactory = dependencies.budgetFactory
    }

    update(config: Partial<AgentConfig>): void {
        this._config = { ...this._config, ...config }
        this.validateConfig(this._config)
    }

    async *run(input: string, session: SessionInterface, options?: AgentRunOptions): AsyncIterable<AgentEvent> {
        if (session.status === SESSION_STATUS.RUNNING) {
            throw new AgentSessionError(
                `Session "${session.id}" is already running. Stop it before starting a new run.`
            )
        }

        const abortController = new AbortController()
        this.abortControllers.set(session.id, abortController)

        session.setStatus(SESSION_STATUS.RUNNING)

        const trace = await this.observability.startTrace(this.config.id, session.id)

        try {
            yield* this.executeLoop(input, session, abortController.signal, trace.id, options)
        } catch (error) {
            await this.recordErrorEvent(trace.id, session.id, error)
            yield* this.handleRunError(error, session)
        } finally {
            await this.observability.endTrace(trace.id)
            this.abortControllers.delete(session.id)
            void this.memory
                .consolidate(this.config.id, session)
                .catch((error: unknown) => this.recordErrorEvent(trace.id, session.id, error))
            session.commitSession()
            session.setStatus(SESSION_STATUS.IDLE)
        }
    }

    async stop(sessionId: string): Promise<void> {
        const controller = this.abortControllers.get(sessionId)

        if (!controller) return

        controller.abort()
        this.abortControllers.delete(sessionId)
        this.guardrailResolver.abort(sessionId)
    }

    private async *executeLoop(
        input: string,
        session: SessionInterface,
        signal: AbortSignal,
        traceId: string,
        options?: AgentRunOptions
    ): AsyncIterable<AgentEvent> {
        const guardrailPolicy = this.resolveGuardrailPolicy(options?.guardrailPolicy)

        const preparationSpanId = randomUUID()
        await this.observability.startSpan(traceId, {
            id: preparationSpanId,
            type: OBSERVABILITY_SPAN_TYPE.PREPARATION,
            startedAt: Date.now()
        })

        yield* this.checkInputGuardrails(input, session.id, traceId, preparationSpanId, guardrailPolicy.input)

        await this.rebuildSystemPrompts(session, options?.systemPrompt)

        const sessionOptimizationSpanId = randomUUID()
        await this.observability.startSpan(traceId, {
            id: sessionOptimizationSpanId,
            parentId: preparationSpanId,
            type: OBSERVABILITY_SPAN_TYPE.SESSION_OPTIMIZATION,
            startedAt: Date.now()
        })

        const capabilities = await this.config.provider.getCapabilities(this.config.model)
        const contextWindow = capabilities.maxContextWindow
        await session.optimize(contextWindow, this.config.provider, this.config.model)

        await this.observability.recordEvent(traceId, {
            id: randomUUID(),
            agentId: this.config.id,
            sessionId: session.id,
            createdAt: Date.now(),
            type: OBSERVABILITY_EVENT_TYPE.SESSION_OPTIMIZED
        })

        await this.observability.endSpan(traceId, sessionOptimizationSpanId)

        session.addMessage({
            id: randomUUID(),
            role: MESSAGE_ROLE.USER,
            content: input,
            createdAt: Date.now()
        })

        const modelInfo = await this.config.provider.getModelInfo(this.config.model)

        const budget = this.config.budget !== undefined ? this.budgetFactory(this.config.budget) : undefined
        budget?.initialize(modelInfo?.pricing)

        const toolsSpanId = randomUUID()
        await this.observability.startSpan(traceId, {
            id: toolsSpanId,
            parentId: preparationSpanId,
            type: OBSERVABILITY_SPAN_TYPE.TOOLS_BUILD,
            startedAt: Date.now()
        })

        const toolPool = await this.toolOrchestrator.buildPool(this.config)
        const tools = this.toolOrchestrator.buildTools(toolPool)

        await this.observability.recordEvent(traceId, {
            id: randomUUID(),
            agentId: this.config.id,
            sessionId: session.id,
            createdAt: Date.now(),
            type: OBSERVABILITY_EVENT_TYPE.TOOL_POOL_BUILT,
            toolCount: Object.keys(toolPool).length
        })

        await this.observability.endSpan(traceId, toolsSpanId)

        await this.observability.endSpan(traceId, preparationSpanId)

        const runSpanId = randomUUID()
        await this.observability.startSpan(traceId, {
            id: runSpanId,
            type: OBSERVABILITY_SPAN_TYPE.RUN,
            startedAt: Date.now()
        })

        try {
            if (options?.forcedToolCalls !== undefined && options.forcedToolCalls.length > 0) {
                yield* this.executeForcedToolCalls(
                    options.forcedToolCalls,
                    session,
                    traceId,
                    runSpanId,
                    signal,
                    budget,
                    guardrailPolicy
                )
            }

            const strategyInput = {
                messages: session.getMessages().map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                generate: this.generate.bind(this, tools)
            }

            const generator = this.config.thinkingStrategy.execute(strategyInput)

            let next: ToolResult | undefined = undefined

            let iterationSpanId: string | null = null

            while (true) {
                if (signal.aborted) {
                    if (iterationSpanId !== null) {
                        await this.observability.endSpan(traceId, iterationSpanId)
                        iterationSpanId = null
                    }
                    break
                }

                if (iterationSpanId === null) {
                    iterationSpanId = randomUUID()
                    await this.observability.startSpan(traceId, {
                        id: iterationSpanId,
                        parentId: runSpanId,
                        type: OBSERVABILITY_SPAN_TYPE.ITERATION,
                        startedAt: Date.now()
                    })
                }

                const { value: decision, done } = await generator.next(next)

                if (done) {
                    await this.observability.endSpan(traceId, iterationSpanId)
                    iterationSpanId = null
                    break
                }

                next = undefined

                if (decision.type === STRATEGY_DECISION.THINKING_DELTA) {
                    yield {
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.THINKING_DELTA,
                        agentId: this.config.id,
                        sessionId: session.id,
                        delta: decision.delta,
                        createdAt: Date.now()
                    }
                    continue
                }

                if (decision.type === STRATEGY_DECISION.THINKING) {
                    await this.observability.recordEvent(traceId, {
                        id: randomUUID(),
                        agentId: this.config.id,
                        sessionId: session.id,
                        createdAt: Date.now(),
                        type: OBSERVABILITY_EVENT_TYPE.THINKING,
                        thinking: decision.thinking
                    })

                    yield {
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.THINKING,
                        agentId: this.config.id,
                        sessionId: session.id,
                        thinking: decision.thinking,
                        createdAt: Date.now()
                    }
                    continue
                }

                if (decision.type === STRATEGY_DECISION.MESSAGE_DELTA) {
                    yield {
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.MESSAGE_DELTA,
                        agentId: this.config.id,
                        sessionId: session.id,
                        delta: decision.delta,
                        createdAt: Date.now()
                    }
                    continue
                }

                if (decision.type === STRATEGY_DECISION.MESSAGE) {
                    session.addMessage({
                        id: randomUUID(),
                        role: MESSAGE_ROLE.ASSISTANT,
                        content: decision.content,
                        createdAt: Date.now()
                    })

                    await this.observability.recordEvent(traceId, {
                        id: randomUUID(),
                        agentId: this.config.id,
                        sessionId: session.id,
                        createdAt: Date.now(),
                        type: OBSERVABILITY_EVENT_TYPE.MESSAGE,
                        message: decision.content
                    })

                    yield* this.checkOutputGuardrails(
                        decision.content,
                        session.id,
                        traceId,
                        iterationSpanId,
                        guardrailPolicy.output
                    )

                    yield {
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.MESSAGE,
                        agentId: this.config.id,
                        sessionId: session.id,
                        message: decision.content,
                        createdAt: Date.now()
                    }
                    continue
                }

                if (decision.type === STRATEGY_DECISION.TOOL_CALL_START) {
                    yield {
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.TOOL_CALL_START,
                        agentId: this.config.id,
                        sessionId: session.id,
                        toolCallId: decision.toolCallId,
                        toolName: decision.toolName,
                        createdAt: Date.now()
                    }
                    continue
                }

                if (decision.type === STRATEGY_DECISION.TOOL_CALL_DELTA) {
                    yield {
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.TOOL_CALL_DELTA,
                        agentId: this.config.id,
                        sessionId: session.id,
                        toolCallId: decision.toolCallId,
                        argumentsDelta: decision.argumentsDelta,
                        createdAt: Date.now()
                    }
                    continue
                }

                if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
                    session.addMessage({
                        id: randomUUID(),
                        role: MESSAGE_ROLE.ASSISTANT,
                        content: [
                            {
                                type: CONTENT_TYPE.TOOL_CALL,
                                toolCall: {
                                    id: decision.toolCall.id,
                                    function: {
                                        name: decision.toolCall.name,
                                        arguments: JSON.stringify(decision.toolCall.arguments)
                                    }
                                }
                            }
                        ],
                        createdAt: Date.now()
                    })

                    await this.observability.recordEvent(traceId, {
                        id: randomUUID(),
                        agentId: this.config.id,
                        sessionId: session.id,
                        createdAt: Date.now(),
                        type: OBSERVABILITY_EVENT_TYPE.TOOL_CALL,
                        toolCall: decision.toolCall
                    })

                    yield {
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.TOOL_CALL,
                        agentId: this.config.id,
                        sessionId: session.id,
                        toolCall: decision.toolCall,
                        createdAt: Date.now()
                    }

                    const toolResult = yield* this.executeToolCall(
                        decision.toolCall,
                        toolPool,
                        session,
                        traceId,
                        iterationSpanId,
                        signal,
                        budget,
                        guardrailPolicy.toolCall
                    )

                    const outputContent =
                        typeof toolResult.output === 'string' ? toolResult.output : JSON.stringify(toolResult.output)

                    session.addMessage({
                        id: randomUUID(),
                        role: MESSAGE_ROLE.TOOL_RESULT,
                        content: [
                            {
                                type: CONTENT_TYPE.TOOL_RESULT,
                                toolResult: {
                                    id: toolResult.id,
                                    content: outputContent,
                                    isError: toolResult.isError
                                }
                            }
                        ],
                        createdAt: Date.now()
                    })

                    await this.observability.recordEvent(traceId, {
                        id: randomUUID(),
                        agentId: this.config.id,
                        sessionId: session.id,
                        createdAt: Date.now(),
                        type: OBSERVABILITY_EVENT_TYPE.TOOL_RESULT,
                        toolResult
                    })

                    yield* this.checkOutputGuardrails(
                        outputContent,
                        session.id,
                        traceId,
                        iterationSpanId,
                        guardrailPolicy.output
                    )

                    yield {
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.TOOL_RESULT,
                        agentId: this.config.id,
                        sessionId: session.id,
                        toolResult,
                        createdAt: Date.now()
                    }

                    next = toolResult
                    continue
                }

                if (decision.type === STRATEGY_DECISION.PLAN) {
                    session.addMessage({
                        id: randomUUID(),
                        role: MESSAGE_ROLE.ASSISTANT,
                        content: JSON.stringify(decision.plan, null, 2),
                        createdAt: Date.now(),
                        metadata: { type: 'plan' }
                    })

                    yield {
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.PLAN,
                        agentId: this.config.id,
                        sessionId: session.id,
                        plan: decision.plan,
                        createdAt: Date.now()
                    }
                    continue
                }

                if (decision.type === STRATEGY_DECISION.STEP_STARTED) {
                    yield {
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.STEP_STARTED,
                        agentId: this.config.id,
                        sessionId: session.id,
                        stepId: decision.stepId,
                        description: decision.description,
                        createdAt: Date.now()
                    }
                    continue
                }

                if (decision.type === STRATEGY_DECISION.STEP_COMPLETED) {
                    yield {
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.STEP_COMPLETED,
                        agentId: this.config.id,
                        sessionId: session.id,
                        stepId: decision.stepId,
                        result: decision.result,
                        createdAt: Date.now()
                    }
                    continue
                }

                if (decision.type === STRATEGY_DECISION.STEP_FAILED) {
                    yield {
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.STEP_FAILED,
                        agentId: this.config.id,
                        sessionId: session.id,
                        stepId: decision.stepId,
                        error: decision.error,
                        createdAt: Date.now()
                    }
                    continue
                }

                if (decision.type === STRATEGY_DECISION.ITERATION) {
                    budget?.trackIteration()

                    if (decision.usage != null) {
                        budget?.trackTokens(decision.usage)
                        session.setUsage(decision.usage)
                    }

                    if (budget !== undefined) {
                        const budgetCheck = budget.check()

                        if (budgetCheck.exceeded) {
                            throw new AgentBudgetError(budgetCheck.reason)
                        }
                    }

                    await this.observability.recordEvent(traceId, {
                        id: randomUUID(),
                        agentId: this.config.id,
                        sessionId: session.id,
                        createdAt: Date.now(),
                        type: OBSERVABILITY_EVENT_TYPE.ITERATION,
                        ...(decision.usage != null && { usage: decision.usage }),
                        ...(budget !== undefined && { budgetState: budget.getState() })
                    })

                    await this.observability.endSpan(traceId, iterationSpanId)
                    iterationSpanId = null

                    yield {
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.ITERATION,
                        agentId: this.config.id,
                        sessionId: session.id,
                        ...(decision.usage != null && { usage: decision.usage }),
                        ...(budget !== undefined && { budgetState: budget.getState() }),
                        createdAt: Date.now()
                    }
                    continue
                }

                await this.observability.recordEvent(traceId, {
                    id: randomUUID(),
                    agentId: this.config.id,
                    sessionId: session.id,
                    createdAt: Date.now(),
                    type: OBSERVABILITY_EVENT_TYPE.DONE
                })

                await this.observability.endSpan(traceId, iterationSpanId)
                iterationSpanId = null

                if (options?.outputSchema !== undefined) {
                    yield* this.structuredOutputExtractor.extract(
                        this.config.provider,
                        this.config.model,
                        session.getMessages().map(msg => ({
                            role: msg.role,
                            content: msg.content
                        })),
                        options.outputSchema,
                        this.config.id,
                        session.id
                    )
                }

                yield {
                    id: randomUUID(),
                    type: AGENT_EVENT_TYPE.DONE,
                    agentId: this.config.id,
                    sessionId: session.id,
                    createdAt: Date.now()
                }
                break
            }
        } finally {
            await this.observability.endSpan(traceId, runSpanId)
        }
    }

    private async *executeToolCall(
        toolCall: ToolCall,
        toolPool: Record<string, ToolInterface>,
        session: SessionInterface,
        traceId: string,
        iterationSpanId: string,
        signal: AbortSignal,
        budget: BudgetInterface | undefined,
        guardrailMode: GuardrailCheckMode,
        bypassGuardrails = false
    ): AsyncIterable<AgentEvent, ToolResult> {
        const toolCallSpanId = randomUUID()
        await this.observability.startSpan(traceId, {
            id: toolCallSpanId,
            parentId: iterationSpanId,
            type: OBSERVABILITY_SPAN_TYPE.TOOL_CALL,
            startedAt: Date.now(),
            metadata: { toolName: toolCall.name }
        })

        try {
            if (!bypassGuardrails) {
                const guardrailResult = yield* this.checkToolCallGuardrails(
                    toolCall,
                    session.id,
                    traceId,
                    toolCallSpanId,
                    guardrailMode
                )

                if (guardrailResult !== null) {
                    return guardrailResult
                }
            }

            budget?.trackToolCall()

            return await this.toolOrchestrator.execute(
                toolCall,
                toolPool,
                this.config.id,
                session.id,
                session.workingDirectory,
                signal
            )
        } finally {
            await this.observability.endSpan(traceId, toolCallSpanId)
        }
    }

    private async *executeForcedToolCalls(
        forcedToolCalls: Array<ForcedToolCall>,
        session: SessionInterface,
        traceId: string,
        parentSpanId: string,
        signal: AbortSignal,
        budget: BudgetInterface | undefined,
        guardrailPolicy: Required<GuardrailRunPolicy>
    ): AsyncIterable<AgentEvent> {
        for (const forced of forcedToolCalls) {
            const toolCall: ToolCall = {
                id: randomUUID(),
                name: forced.tool.name,
                arguments: forced.arguments
            }

            yield {
                id: randomUUID(),
                type: AGENT_EVENT_TYPE.TOOL_CALL_START,
                agentId: this.config.id,
                sessionId: session.id,
                toolCallId: toolCall.id,
                toolName: toolCall.name,
                createdAt: Date.now()
            }

            session.addMessage({
                id: randomUUID(),
                role: MESSAGE_ROLE.ASSISTANT,
                content: [
                    {
                        type: CONTENT_TYPE.TOOL_CALL,
                        toolCall: {
                            id: toolCall.id,
                            function: {
                                name: toolCall.name,
                                arguments: JSON.stringify(toolCall.arguments)
                            }
                        }
                    }
                ],
                createdAt: Date.now()
            })

            yield {
                id: randomUUID(),
                type: AGENT_EVENT_TYPE.TOOL_CALL,
                agentId: this.config.id,
                sessionId: session.id,
                toolCall,
                createdAt: Date.now()
            }

            const toolResult = yield* this.executeToolCall(
                toolCall,
                { [toolCall.name]: forced.tool },
                session,
                traceId,
                parentSpanId,
                signal,
                budget,
                guardrailPolicy.toolCall,
                forced.bypassGuardrails ?? false
            )

            const outputContent =
                typeof toolResult.output === 'string' ? toolResult.output : JSON.stringify(toolResult.output)

            session.addMessage({
                id: randomUUID(),
                role: MESSAGE_ROLE.TOOL_RESULT,
                content: [
                    {
                        type: CONTENT_TYPE.TOOL_RESULT,
                        toolResult: {
                            id: toolResult.id,
                            content: outputContent,
                            isError: toolResult.isError
                        }
                    }
                ],
                createdAt: Date.now()
            })

            yield* this.checkOutputGuardrails(outputContent, session.id, traceId, parentSpanId, guardrailPolicy.output)

            yield {
                id: randomUUID(),
                type: AGENT_EVENT_TYPE.TOOL_RESULT,
                agentId: this.config.id,
                sessionId: session.id,
                toolResult,
                createdAt: Date.now()
            }
        }
    }

    private async *runGuardrail(
        generator: AsyncGenerator<GuardrailEvent, GuardrailCheckResult>,
        sessionId: string,
        mode: GuardrailCheckMode
    ): AsyncGenerator<AgentEvent, GuardrailCheckResult> {
        while (true) {
            const { value, done } = await generator.next()

            if (done) return value

            if (mode === GUARDRAIL_CHECK_MODE.FAIL) {
                throw new AgentGuardrailDecisionRequiredError()
            }

            if (mode === GUARDRAIL_CHECK_MODE.SAFE_SKIP) {
                return { action: GUARDRAIL_ACTION.ALLOW }
            }

            yield {
                id: randomUUID(),
                type: AGENT_EVENT_TYPE.GUARDRAIL_REQUEST,
                ...value,
                agentId: this.config.id,
                sessionId
            }
        }
    }

    private async *checkInputGuardrails(
        input: string,
        sessionId: string,
        traceId: string,
        parentSpanId: string,
        mode: GuardrailCheckMode
    ): AsyncIterable<AgentEvent> {
        if (mode === GUARDRAIL_CHECK_MODE.SKIP) {
            return
        }

        const spanId = randomUUID()
        await this.observability.startSpan(traceId, {
            id: spanId,
            parentId: parentSpanId,
            type: OBSERVABILITY_SPAN_TYPE.GUARDRAIL_INPUT,
            startedAt: Date.now()
        })

        try {
            for (const guardrail of this.guardrails) {
                const result = yield* this.runGuardrail(
                    guardrail.checkInput(input, sessionId, this.config.guardrailRules?.[guardrail.id]),
                    sessionId,
                    mode
                )

                await this.observability.recordEvent(traceId, {
                    id: randomUUID(),
                    agentId: this.config.id,
                    sessionId: sessionId,
                    createdAt: Date.now(),
                    type: OBSERVABILITY_EVENT_TYPE.GUARDRAIL_INPUT,
                    guardrailName: guardrail.constructor.name,
                    action: result.action,
                    ...((result.action === GUARDRAIL_ACTION.WARN || result.action === GUARDRAIL_ACTION.BLOCK) && {
                        reason: result.reason
                    })
                })

                if (result.action === GUARDRAIL_ACTION.BLOCK) {
                    throw new AgentGuardrailError(result.reason)
                }
            }
        } finally {
            await this.observability.endSpan(traceId, spanId)
        }
    }

    private async *checkOutputGuardrails(
        output: string,
        sessionId: string,
        traceId: string,
        parentSpanId: string,
        mode: GuardrailCheckMode
    ): AsyncIterable<AgentEvent> {
        if (mode === GUARDRAIL_CHECK_MODE.SKIP) {
            return
        }

        const spanId = randomUUID()
        await this.observability.startSpan(traceId, {
            id: spanId,
            parentId: parentSpanId,
            type: OBSERVABILITY_SPAN_TYPE.GUARDRAIL_OUTPUT,
            startedAt: Date.now()
        })

        try {
            for (const guardrail of this.guardrails) {
                const result = yield* this.runGuardrail(
                    guardrail.checkOutput(output, sessionId, this.config.guardrailRules?.[guardrail.id]),
                    sessionId,
                    mode
                )

                await this.observability.recordEvent(traceId, {
                    id: randomUUID(),
                    agentId: this.config.id,
                    sessionId: sessionId,
                    createdAt: Date.now(),
                    type: OBSERVABILITY_EVENT_TYPE.GUARDRAIL_OUTPUT,
                    guardrailName: guardrail.constructor.name,
                    action: result.action,
                    ...((result.action === GUARDRAIL_ACTION.WARN || result.action === GUARDRAIL_ACTION.BLOCK) && {
                        reason: result.reason
                    })
                })

                if (result.action === GUARDRAIL_ACTION.BLOCK) {
                    throw new AgentGuardrailError(result.reason)
                }
            }
        } finally {
            await this.observability.endSpan(traceId, spanId)
        }
    }

    private async *runToolCallGuardrail(
        generator: AsyncGenerator<GuardrailEvent, GuardrailCheckResult>,
        sessionId: string,
        autoApprove: boolean,
        mode: GuardrailCheckMode
    ): AsyncGenerator<AgentEvent, { result: GuardrailCheckResult; interacted: boolean }> {
        let interacted = false
        while (true) {
            const { value, done } = await generator.next()
            if (done) return { result: value, interacted }

            if (mode === GUARDRAIL_CHECK_MODE.FAIL) {
                throw new AgentGuardrailDecisionRequiredError()
            }

            if (mode === GUARDRAIL_CHECK_MODE.SAFE_SKIP) {
                return { result: { action: GUARDRAIL_ACTION.ALLOW }, interacted }
            }

            if (autoApprove) {
                const resultPromise = generator.next()
                this.guardrailResolver.resolve(value.requestId, GUARDRAIL_REQUEST_DECISION.APPROVE)
                const { value: nextValue, done: nextDone } = await resultPromise
                if (nextDone) return { result: nextValue, interacted }
                interacted = true
                yield {
                    id: randomUUID(),
                    type: AGENT_EVENT_TYPE.GUARDRAIL_REQUEST,
                    ...nextValue,
                    agentId: this.config.id,
                    sessionId
                }
            } else {
                interacted = true
                yield {
                    id: randomUUID(),
                    type: AGENT_EVENT_TYPE.GUARDRAIL_REQUEST,
                    ...value,
                    agentId: this.config.id,
                    sessionId
                }
            }
        }
    }

    private async *checkToolCallGuardrails(
        toolCall: ToolCall,
        sessionId: string,
        traceId: string,
        parentSpanId: string,
        mode: GuardrailCheckMode
    ): AsyncIterable<AgentEvent, ToolResult | null> {
        if (mode === GUARDRAIL_CHECK_MODE.SKIP) {
            return null
        }

        const spanId = randomUUID()
        await this.observability.startSpan(traceId, {
            id: spanId,
            parentId: parentSpanId,
            type: OBSERVABILITY_SPAN_TYPE.GUARDRAIL_TOOL,
            startedAt: Date.now(),
            metadata: { toolName: toolCall.name }
        })

        let requestApproved = false

        try {
            for (const guardrail of this.guardrails) {
                const { result, interacted } = yield* this.runToolCallGuardrail(
                    guardrail.checkToolCall(toolCall, sessionId, this.config.guardrailRules?.[guardrail.id]),
                    sessionId,
                    requestApproved,
                    mode
                )

                if (interacted && result.action === GUARDRAIL_ACTION.ALLOW) {
                    requestApproved = true
                }

                await this.observability.recordEvent(traceId, {
                    id: randomUUID(),
                    agentId: this.config.id,
                    sessionId,
                    createdAt: Date.now(),
                    type: OBSERVABILITY_EVENT_TYPE.GUARDRAIL_TOOL,
                    guardrailName: guardrail.constructor.name,
                    toolName: toolCall.name,
                    action: result.action,
                    ...((result.action === GUARDRAIL_ACTION.WARN || result.action === GUARDRAIL_ACTION.BLOCK) && {
                        reason: result.reason
                    })
                })

                if (result.action === GUARDRAIL_ACTION.BLOCK) {
                    return {
                        id: toolCall.id,
                        name: toolCall.name,
                        output: result.reason,
                        isError: true
                    }
                }
            }
        } finally {
            await this.observability.endSpan(traceId, spanId)
        }

        return null
    }

    private async recordErrorEvent(traceId: string, sessionId: string, error: unknown): Promise<void> {
        await this.observability.recordEvent(traceId, {
            id: randomUUID(),
            agentId: this.config.id,
            sessionId,
            createdAt: Date.now(),
            type: OBSERVABILITY_EVENT_TYPE.ERROR,
            error: getErrorMessage(error)
        })
    }

    private resolveGuardrailPolicy(policy?: GuardrailRunPolicy): Required<GuardrailRunPolicy> {
        return {
            input: policy?.input ?? GUARDRAIL_CHECK_MODE.STANDARD,
            output: policy?.output ?? GUARDRAIL_CHECK_MODE.STANDARD,
            toolCall: policy?.toolCall ?? GUARDRAIL_CHECK_MODE.STANDARD
        }
    }

    private async rebuildSystemPrompts(session: SessionInterface, runSystemPrompt?: string): Promise<void> {
        const nonSystemMessages = session.getMessages().filter(msg => msg.role !== MESSAGE_ROLE.SYSTEM)

        const memoryPrompt = await this.memory.buildPrompt(this.config.id, session)

        const prompts = [
            buildBasePrompt(this.config),
            buildAgentIdentityPrompt(this.config),
            buildDateTimePrompt(this.config.timezone),
            session.workingDirectory ? buildWorkingDirectoryPrompt(session.workingDirectory) : undefined,
            memoryPrompt,
            this.config.thinkingStrategy.systemPrompt,
            this.config.systemPrompt,
            runSystemPrompt
        ].filter((prompt): prompt is string => Boolean(prompt?.trim()))

        const systemMessages = prompts.map((prompt, index) => ({
            id: `system-${index}`,
            role: MESSAGE_ROLE.SYSTEM,
            content: prompt,
            createdAt: Date.now()
        }))

        session.setMessages([...systemMessages, ...nonSystemMessages])
    }

    private generate(tools: Array<Tool>, messages: Array<Message>, options?: GenerateOptions) {
        return this.config.provider.generateStream({
            model: this.config.model,
            messages,
            stream: true,
            ...(options?.useTools !== false && { tools, toolChoice: { type: 'auto' as const } }),
            ...(options?.responseFormat !== undefined && { responseFormat: options.responseFormat }),
            ...(this.config.temperature !== undefined && { temperature: this.config.temperature })
        })
    }

    private *handleRunError(error: unknown, session: SessionInterface): Iterable<AgentEvent> {
        const message = getErrorMessage(error)

        yield {
            id: randomUUID(),
            type: AGENT_EVENT_TYPE.ERROR,
            agentId: this.config.id,
            sessionId: session.id,
            error: message,
            recoverable: false,
            createdAt: Date.now()
        }

        if (error instanceof AgentError) {
            throw error
        }

        throw new AgentUnexpectedError(message, { cause: error })
    }

    private validateConfig(config: AgentConfig): void {
        if (!config.id.trim()) {
            throw new AgentConfigError('Agent config must have a non-empty id')
        }

        if (!config.name.trim()) {
            throw new AgentConfigError('Agent config must have a non-empty name')
        }

        if (!config.model.trim()) {
            throw new AgentConfigError('Agent config must have a non-empty model')
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defends against callers that bypass the type system (e.g. `as never`), not just TS-checked call sites
        if (!config.provider) {
            throw new AgentConfigError('Agent config must have a provider')
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defends against callers that bypass the type system (e.g. `as never`), not just TS-checked call sites
        if (!config.thinkingStrategy) {
            throw new AgentConfigError('Agent config must have a thinkingStrategy')
        }
    }
}
