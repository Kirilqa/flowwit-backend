import { Agent } from '@agent/implementations/Agent'
import { AgentConfigError } from '@agent/errors/AgentConfigError'
import { AgentUnexpectedError } from '@agent/errors/AgentUnexpectedError'
import {
    AgentGuardrailError,
    AgentGuardrailDecisionRequiredError,
    GUARDRAIL_ACTION,
    GUARDRAIL_CHECK_MODE,
    GUARDRAIL_REQUEST_CONTEXT_TYPE,
    GuardrailInterface,
    GuardrailCheckResult,
    GuardrailEvent
} from '@guardrail'
import { AgentBudgetError, BudgetFactory, BudgetInterface } from '@agent/budget'
import { SESSION_STATUS } from '@session'
import { AGENT_EVENT_TYPE } from '@agent/types/AgentEventType'
import { AgentEvent } from '@agent/types/AgentEvent'
import { ThinkingStrategyInterface, StrategyDecision, STRATEGY_DECISION, StrategyInput } from '@strategy'
import { ToolResult } from '@tool/types/ToolResult'
import { ToolOrchestratorInterface } from '@agent/toolOrchestrator'
import {
    makeAgentConfig,
    makeAgentDependencies,
    makeGuardrailResolver,
    makeSession,
    makeToolOrchestrator,
    makeToolMock
} from '../../../helpers/makeAgent'
import { makeProvider, TEST_MODEL, textResponse, toolCallResponse, errorResponse } from '../../../helpers/TestProvider'
import { RESPONSE_FORMAT_TYPE } from '@provider/types/request/ResponseFormatType'

function makeInteractiveGuardrail(
    id: string,
    hook: 'checkInput' | 'checkOutput' | 'checkToolCall',
    yieldCount = 1,
    finalResult: GuardrailCheckResult = { action: GUARDRAIL_ACTION.ALLOW }
): GuardrailInterface {
    async function* interactiveGenerator(): AsyncGenerator<GuardrailEvent, GuardrailCheckResult> {
        for (let i = 0; i < yieldCount; i++) {
            yield {
                requestId: `${id}-req-${i}`,
                context: { type: GUARDRAIL_REQUEST_CONTEXT_TYPE.TOOL_CALL, toolCallId: 'call-1' },
                createdAt: Date.now()
            }
        }
        return finalResult
    }

    async function* passthroughGenerator(): AsyncGenerator<GuardrailEvent, GuardrailCheckResult> {
        return { action: GUARDRAIL_ACTION.ALLOW }
    }

    return {
        id,
        checkInput: hook === 'checkInput' ? () => interactiveGenerator() : () => passthroughGenerator(),
        checkOutput: hook === 'checkOutput' ? () => interactiveGenerator() : () => passthroughGenerator(),
        checkToolCall: hook === 'checkToolCall' ? () => interactiveGenerator() : () => passthroughGenerator()
    }
}

function makeDelegatingToolOrchestrator(): ToolOrchestratorInterface {
    return {
        buildPool: jest.fn().mockResolvedValue({}),
        buildTools: jest.fn().mockReturnValue([]),
        execute: jest.fn(async (toolCall, toolPool, agentId, sessionId, workingDirectory) => {
            const tool = toolPool[toolCall.name]
            if (!tool) throw new Error(`Unknown tool: ${toolCall.name}`)
            const output = await tool.execute(toolCall.arguments, agentId, sessionId, workingDirectory)
            return { id: toolCall.id, name: toolCall.name, output, isError: false }
        })
    }
}

async function collectEvents(
    agent: Agent,
    input: string,
    sessionId = 'session-1'
): Promise<{ events: Array<AgentEvent>; error: unknown }> {
    const session = makeSession(sessionId)
    const events: Array<AgentEvent> = []
    let error: unknown = undefined
    try {
        for await (const event of agent.run(input, session)) {
            events.push(event)
        }
    } catch (e) {
        error = e
    }
    return { events, error }
}

function eventTypes(events: Array<AgentEvent>): Array<string> {
    return events.map(e => e.type)
}

describe('Agent', () => {
    describe('constructor — config validation', () => {
        it('throws AgentConfigError when id is empty', () => {
            expect(() => new Agent(makeAgentConfig({ id: '' }), makeAgentDependencies())).toThrow(AgentConfigError)
        })

        it('throws AgentConfigError when id is whitespace', () => {
            expect(() => new Agent(makeAgentConfig({ id: '   ' }), makeAgentDependencies())).toThrow(AgentConfigError)
        })

        it('throws AgentConfigError when name is empty', () => {
            expect(() => new Agent(makeAgentConfig({ name: '' }), makeAgentDependencies())).toThrow(AgentConfigError)
        })

        it('throws AgentConfigError when model is empty', () => {
            expect(() => new Agent(makeAgentConfig({ model: '' }), makeAgentDependencies())).toThrow(AgentConfigError)
        })

        it('throws AgentConfigError when provider is missing', () => {
            expect(() => new Agent(makeAgentConfig({ provider: null as never }), makeAgentDependencies())).toThrow(
                AgentConfigError
            )
        })

        it('throws AgentConfigError when thinkingStrategy is missing', () => {
            expect(
                () => new Agent(makeAgentConfig({ thinkingStrategy: null as never }), makeAgentDependencies())
            ).toThrow(AgentConfigError)
        })

        it('does not throw for valid config', () => {
            expect(() => new Agent(makeAgentConfig(), makeAgentDependencies())).not.toThrow()
        })
    })

    describe('run() — text response', () => {
        it('emits MESSAGE_DELTA event', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('Hello!'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const { events } = await collectEvents(agent, 'hi')
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.MESSAGE_DELTA)
        })

        it('MESSAGE_DELTA delta contains the response text', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('World'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const { events } = await collectEvents(agent, 'hi')
            const delta = events.find(e => e.type === AGENT_EVENT_TYPE.MESSAGE_DELTA)
            if (delta?.type !== AGENT_EVENT_TYPE.MESSAGE_DELTA) throw new Error()
            expect(delta.delta).toBe('World')
        })

        it('emits MESSAGE event', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('Reply'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const { events } = await collectEvents(agent, 'hi')
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.MESSAGE)
        })

        it('MESSAGE event carries full response text', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('Full reply'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const { events } = await collectEvents(agent, 'hi')
            const msg = events.find(e => e.type === AGENT_EVENT_TYPE.MESSAGE)
            if (msg?.type !== AGENT_EVENT_TYPE.MESSAGE) throw new Error()
            expect(msg.message).toBe('Full reply')
        })

        it('emits ITERATION event', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('hi'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const { events } = await collectEvents(agent, 'hello')
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.ITERATION)
        })

        it('emits DONE as the last event', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('hi'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const { events } = await collectEvents(agent, 'hello')
            const last = events[events.length - 1]
            expect(last?.type).toBe(AGENT_EVENT_TYPE.DONE)
        })

        it('emits events in correct order for text response', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('hi'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const { events } = await collectEvents(agent, 'hello')
            expect(eventTypes(events)).toEqual([
                AGENT_EVENT_TYPE.MESSAGE_DELTA,
                AGENT_EVENT_TYPE.MESSAGE,
                AGENT_EVENT_TYPE.ITERATION,
                AGENT_EVENT_TYPE.DONE
            ])
        })

        it('sets agentId on every event', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('hi'))
            const agent = new Agent(makeAgentConfig({ id: 'my-agent', provider }), makeAgentDependencies())
            const { events } = await collectEvents(agent, 'hello')
            expect(events.every(e => e.agentId === 'my-agent')).toBe(true)
        })
    })

    describe('run() — tool call response', () => {
        it('emits TOOL_CALL_START event', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', { q: 'test' }))
            provider.respondWith(textResponse('results'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const { events } = await collectEvents(agent, 'search for test')
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.TOOL_CALL_START)
        })

        it('emits TOOL_CALL event with correct tool name', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', { q: 'test' }))
            provider.respondWith(textResponse('results'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const { events } = await collectEvents(agent, 'search')
            const toolCallEvent = events.find(e => e.type === AGENT_EVENT_TYPE.TOOL_CALL)
            if (toolCallEvent?.type !== AGENT_EVENT_TYPE.TOOL_CALL) throw new Error()
            expect(toolCallEvent.toolCall.name).toBe('search')
        })

        it('emits TOOL_RESULT event', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', {}))
            provider.respondWith(textResponse('results'))
            const orchestrator = makeToolOrchestrator({
                id: 'call-1',
                name: 'search',
                output: 'found it',
                isError: false
            })
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ toolOrchestrator: orchestrator })
            )
            const { events } = await collectEvents(agent, 'search')
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.TOOL_RESULT)
        })

        it('emits full event sequence for tool call then text', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', {}))
            provider.respondWith(textResponse('done'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const { events } = await collectEvents(agent, 'query')
            expect(eventTypes(events)).toEqual([
                AGENT_EVENT_TYPE.TOOL_CALL_START,
                AGENT_EVENT_TYPE.TOOL_CALL,
                AGENT_EVENT_TYPE.TOOL_RESULT,
                AGENT_EVENT_TYPE.ITERATION,
                AGENT_EVENT_TYPE.MESSAGE_DELTA,
                AGENT_EVENT_TYPE.MESSAGE,
                AGENT_EVENT_TYPE.ITERATION,
                AGENT_EVENT_TYPE.DONE
            ])
        })
    })

    describe('run() — session management', () => {
        it('throws AgentSessionError when session is already running', async () => {
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const session = makeSession()
            session.setStatus(SESSION_STATUS.RUNNING)
            await expect(async () => {
                for await (const _ of agent.run('hello', session));
            }).rejects.toThrow('already running')
        })

        it('session status is IDLE after successful run', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const session = makeSession()
            for await (const _ of agent.run('hello', session));
            expect(session.status).toBe(SESSION_STATUS.IDLE)
        })

        it('session status is IDLE after error in run', async () => {
            const provider = makeProvider()
            provider.respondWith(errorResponse(new Error('fail')))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const session = makeSession()
            try {
                for await (const _ of agent.run('hello', session));
            } catch {}
            expect(session.status).toBe(SESSION_STATUS.IDLE)
        })

        it('session contains user message after run', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('reply'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const session = makeSession()
            for await (const _ of agent.run('user input', session));
            const messages = session.getMessages()
            const userMsg = messages.find(m => m.role === 'user')
            expect(userMsg).toBeDefined()
            expect(userMsg?.content).toBe('user input')
        })

        it('session contains assistant message after run', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('assistant reply'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const session = makeSession()
            for await (const _ of agent.run('hello', session));
            const messages = session.getMessages()
            const assistantMsg = messages.find(m => m.role === 'assistant' && typeof m.content === 'string')
            expect(assistantMsg).toBeDefined()
            expect(assistantMsg?.content).toBe('assistant reply')
        })
    })

    describe('run() — error handling', () => {
        it('emits ERROR event when provider throws', async () => {
            const provider = makeProvider()
            provider.respondWith(errorResponse(new Error('provider error')))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const { events } = await collectEvents(agent, 'hello')
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.ERROR)
        })

        it('throws AgentUnexpectedError after ERROR event on unexpected error', async () => {
            const provider = makeProvider()
            provider.respondWith(errorResponse(new Error('unexpected')))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const { error } = await collectEvents(agent, 'hello')
            expect(error).toBeInstanceOf(AgentUnexpectedError)
        })

        it('ERROR event contains the error message', async () => {
            const provider = makeProvider()
            provider.respondWith(errorResponse(new Error('something broke')))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const { events } = await collectEvents(agent, 'hello')
            const errEvent = events.find(e => e.type === AGENT_EVENT_TYPE.ERROR)
            if (errEvent?.type !== AGENT_EVENT_TYPE.ERROR) throw new Error()
            expect(errEvent.error).toContain('something broke')
        })
    })

    describe('run() — guardrails', () => {
        it('throws AgentGuardrailError when input is blocked', async () => {
            const blockGuardrail: GuardrailInterface = {
                id: 'block-guardrail',
                async *checkInput() {
                    return { action: GUARDRAIL_ACTION.BLOCK, reason: 'blocked input' }
                },
                async *checkOutput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkToolCall() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                }
            }
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ guardrails: [blockGuardrail] })
            )
            const { error } = await collectEvents(agent, 'bad input')
            expect(error).toBeInstanceOf(AgentGuardrailError)
        })

        it('runs successfully with passthrough guardrail', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const guardrail: GuardrailInterface = {
                id: 'passthrough-guardrail',
                async *checkInput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkOutput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkToolCall() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                }
            }
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies({ guardrails: [guardrail] }))
            const { events, error } = await collectEvents(agent, 'hello')
            expect(error).toBeUndefined()
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.DONE)
        })
    })

    describe('stop()', () => {
        it('does nothing when session is not running', async () => {
            const agent = new Agent(makeAgentConfig(), makeAgentDependencies())
            await expect(agent.stop('nonexistent-session')).resolves.toBeUndefined()
        })
    })

    describe('update()', () => {
        it('updates the agent config', () => {
            const agent = new Agent(makeAgentConfig({ id: 'original' }), makeAgentDependencies())
            agent.update({ name: 'Updated Name' })
            expect(agent.config.name).toBe('Updated Name')
        })

        it('preserves non-updated config fields', () => {
            const agent = new Agent(makeAgentConfig({ id: 'my-id', name: 'Original' }), makeAgentDependencies())
            agent.update({ name: 'New Name' })
            expect(agent.config.id).toBe('my-id')
        })

        it('throws AgentConfigError when update produces invalid config', () => {
            const agent = new Agent(makeAgentConfig(), makeAgentDependencies())
            expect(() => {
                agent.update({ id: '' })
            }).toThrow(AgentConfigError)
        })

        it('exposes config via config getter', () => {
            const agent = new Agent(makeAgentConfig({ id: 'test-id', model: TEST_MODEL }), makeAgentDependencies())
            expect(agent.config.id).toBe('test-id')
            expect(agent.config.model).toBe(TEST_MODEL)
        })
    })

    describe('run() — budget', () => {
        function makeExceededBudgetFactory(): BudgetFactory {
            const budget: BudgetInterface = {
                initialize: jest.fn(),
                getState: jest.fn().mockReturnValue({
                    usedTokens: 0,
                    usedIterations: 1,
                    usedToolCalls: 0,
                    usedCostUsd: 0,
                    elapsedMs: 0
                }),
                trackTokens: jest.fn(),
                trackToolCall: jest.fn(),
                trackIteration: jest.fn(),
                check: jest.fn().mockReturnValue({ exceeded: true, reason: 'iteration limit reached' })
            }
            return _config => budget
        }

        it('throws AgentBudgetError when budget is exceeded', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider, budget: { maxIterations: 1 } }),
                makeAgentDependencies({ budgetFactory: makeExceededBudgetFactory() })
            )
            const { error } = await collectEvents(agent, 'hello')
            expect(error).toBeInstanceOf(AgentBudgetError)
        })

        it('emits ERROR event before throwing AgentBudgetError', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider, budget: { maxIterations: 1 } }),
                makeAgentDependencies({ budgetFactory: makeExceededBudgetFactory() })
            )
            const { events } = await collectEvents(agent, 'hello')
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.ERROR)
        })

        it('includes budgetState in the ITERATION event and does not throw when the budget is not exceeded', async () => {
            const budget: BudgetInterface = {
                initialize: jest.fn(),
                getState: jest.fn().mockReturnValue({
                    usedTokens: 5,
                    usedIterations: 1,
                    usedToolCalls: 0,
                    usedCostUsd: 0,
                    elapsedMs: 10
                }),
                trackTokens: jest.fn(),
                trackToolCall: jest.fn(),
                trackIteration: jest.fn(),
                check: jest.fn().mockReturnValue({ exceeded: false })
            }
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider, budget: { maxIterations: 10 } }),
                makeAgentDependencies({ budgetFactory: () => budget })
            )
            const { events, error } = await collectEvents(agent, 'hello')
            expect(error).toBeUndefined()
            const iterationEvent = events.find(e => e.type === AGENT_EVENT_TYPE.ITERATION)
            if (iterationEvent?.type !== AGENT_EVENT_TYPE.ITERATION) throw new Error()
            expect(iterationEvent.budgetState).toEqual({
                usedTokens: 5,
                usedIterations: 1,
                usedToolCalls: 0,
                usedCostUsd: 0,
                elapsedMs: 10
            })
        })
    })

    describe('run() — thinking events', () => {
        function makeThinkingStrategy(): ThinkingStrategyInterface {
            return {
                name: 'ThinkingTest',
                systemPrompt: '',
                async *execute(_input: StrategyInput): AsyncGenerator<StrategyDecision, void, ToolResult | undefined> {
                    yield { type: STRATEGY_DECISION.THINKING_DELTA, delta: 'thinking...' }
                    yield { type: STRATEGY_DECISION.THINKING, thinking: 'full thought' }
                    yield { type: STRATEGY_DECISION.MESSAGE_DELTA, delta: 'reply' }
                    yield { type: STRATEGY_DECISION.MESSAGE, content: 'reply' }
                    yield { type: STRATEGY_DECISION.ITERATION }
                    yield { type: STRATEGY_DECISION.DONE }
                }
            }
        }

        it('emits THINKING_DELTA event', async () => {
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider, thinkingStrategy: makeThinkingStrategy() }),
                makeAgentDependencies()
            )
            const { events } = await collectEvents(agent, 'hello')
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.THINKING_DELTA)
        })

        it('THINKING_DELTA event contains the delta text', async () => {
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider, thinkingStrategy: makeThinkingStrategy() }),
                makeAgentDependencies()
            )
            const { events } = await collectEvents(agent, 'hello')
            const deltaEvent = events.find(e => e.type === AGENT_EVENT_TYPE.THINKING_DELTA)
            if (deltaEvent?.type !== AGENT_EVENT_TYPE.THINKING_DELTA) throw new Error()
            expect(deltaEvent.delta).toBe('thinking...')
        })

        it('emits THINKING event with full thought', async () => {
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider, thinkingStrategy: makeThinkingStrategy() }),
                makeAgentDependencies()
            )
            const { events } = await collectEvents(agent, 'hello')
            const thinkingEvent = events.find(e => e.type === AGENT_EVENT_TYPE.THINKING)
            if (thinkingEvent?.type !== AGENT_EVENT_TYPE.THINKING) throw new Error()
            expect(thinkingEvent.thinking).toBe('full thought')
        })
    })

    describe('run() — TOOL_CALL_DELTA events', () => {
        function makeToolCallDeltaStrategy(): ThinkingStrategyInterface {
            return {
                name: 'DeltaTest',
                systemPrompt: '',
                async *execute(_input: StrategyInput): AsyncGenerator<StrategyDecision, void, ToolResult | undefined> {
                    yield { type: STRATEGY_DECISION.TOOL_CALL_START, toolCallId: 'c-1', toolName: 'search' }
                    yield { type: STRATEGY_DECISION.TOOL_CALL_DELTA, toolCallId: 'c-1', argumentsDelta: '{"q":' }
                    yield { type: STRATEGY_DECISION.TOOL_CALL_DELTA, toolCallId: 'c-1', argumentsDelta: '"test"}' }
                    yield {
                        type: STRATEGY_DECISION.TOOL_CALL,
                        toolCall: { id: 'c-1', name: 'search', arguments: { q: 'test' } }
                    }
                    yield { type: STRATEGY_DECISION.ITERATION }
                    yield { type: STRATEGY_DECISION.MESSAGE_DELTA, delta: 'done' }
                    yield { type: STRATEGY_DECISION.MESSAGE, content: 'done' }
                    yield { type: STRATEGY_DECISION.ITERATION }
                    yield { type: STRATEGY_DECISION.DONE }
                }
            }
        }

        it('emits TOOL_CALL_DELTA event', async () => {
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider, thinkingStrategy: makeToolCallDeltaStrategy() }),
                makeAgentDependencies()
            )
            const { events } = await collectEvents(agent, 'search')
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.TOOL_CALL_DELTA)
        })

        it('TOOL_CALL_DELTA event has correct argumentsDelta', async () => {
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider, thinkingStrategy: makeToolCallDeltaStrategy() }),
                makeAgentDependencies()
            )
            const { events } = await collectEvents(agent, 'search')
            const deltaEvent = events.find(e => e.type === AGENT_EVENT_TYPE.TOOL_CALL_DELTA)
            if (deltaEvent?.type !== AGENT_EVENT_TYPE.TOOL_CALL_DELTA) throw new Error()
            expect(deltaEvent.argumentsDelta).toBe('{"q":')
        })
    })

    describe('run() — generate() options passthrough', () => {
        function makeGenerateOptionsStrategy(): ThinkingStrategyInterface {
            return {
                name: 'GenerateOptionsTest',
                systemPrompt: '',
                async *execute(input: StrategyInput): AsyncGenerator<StrategyDecision, void, ToolResult | undefined> {
                    const stream = input.generate(input.messages, {
                        useTools: false,
                        responseFormat: { type: RESPONSE_FORMAT_TYPE.TEXT }
                    })
                    for await (const _chunk of stream);
                    yield { type: STRATEGY_DECISION.MESSAGE_DELTA, delta: 'ok' }
                    yield { type: STRATEGY_DECISION.MESSAGE, content: 'ok' }
                    yield { type: STRATEGY_DECISION.ITERATION }
                    yield { type: STRATEGY_DECISION.DONE }
                }
            }
        }

        it('omits the tools field from generateStream when useTools is false', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const generateStreamSpy = jest.spyOn(provider, 'generateStream')
            const agent = new Agent(
                makeAgentConfig({ provider, thinkingStrategy: makeGenerateOptionsStrategy() }),
                makeAgentDependencies()
            )
            const { error } = await collectEvents(agent, 'hello')
            expect(error).toBeUndefined()
            const call = generateStreamSpy.mock.calls[0]?.[0] as { tools?: unknown; responseFormat?: unknown }
            expect(call).not.toHaveProperty('tools')
            expect(call.responseFormat).toEqual({ type: RESPONSE_FORMAT_TYPE.TEXT })
        })

        it('includes temperature in generateStream when set on the config', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const generateStreamSpy = jest.spyOn(provider, 'generateStream')
            const agent = new Agent(makeAgentConfig({ provider, temperature: 0.5 }), makeAgentDependencies())
            const { error } = await collectEvents(agent, 'hello')
            expect(error).toBeUndefined()
            const call = generateStreamSpy.mock.calls[0]?.[0] as { temperature?: number }
            expect(call.temperature).toBe(0.5)
        })
    })

    describe('run() — structured output extraction', () => {
        it('completes without error when outputSchema is provided', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('structured result'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const session = makeSession()
            const events: Array<AgentEvent> = []
            for await (const event of agent.run('hello', session, {
                outputSchema: { type: 'object', properties: {} }
            })) {
                events.push(event)
            }
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.DONE)
        })
    })

    describe('run() — tool call guardrail blocking', () => {
        it('returns blocked tool result when guardrail blocks tool call', async () => {
            const blockGuardrail: GuardrailInterface = {
                id: 'block-tool-call-guardrail',
                async *checkInput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkOutput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkToolCall() {
                    return { action: GUARDRAIL_ACTION.BLOCK, reason: 'forbidden tool' }
                }
            }
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('dangerous', {}))
            provider.respondWith(textResponse('done'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ guardrails: [blockGuardrail] })
            )
            const { events, error } = await collectEvents(agent, 'use dangerous tool')
            expect(error).toBeUndefined()
            const toolResultEvent = events.find(e => e.type === AGENT_EVENT_TYPE.TOOL_RESULT)
            if (toolResultEvent?.type !== AGENT_EVENT_TYPE.TOOL_RESULT) throw new Error()
            expect(toolResultEvent.toolResult.isError).toBe(true)
            expect(toolResultEvent.toolResult.output).toBe('forbidden tool')
        })
    })

    describe('run() — GUARDRAIL_REQUEST event', () => {
        it('emits GUARDRAIL_REQUEST when an input guardrail yields an event before deciding', async () => {
            const interactiveGuardrail: GuardrailInterface = {
                id: 'interactive-guardrail',
                async *checkInput(_input) {
                    yield {
                        requestId: 'req-1',
                        context: { type: GUARDRAIL_REQUEST_CONTEXT_TYPE.INPUT, input: _input },
                        createdAt: Date.now()
                    }
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkOutput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkToolCall() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                }
            }
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ guardrails: [interactiveGuardrail] })
            )
            const { events } = await collectEvents(agent, 'hello')
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.GUARDRAIL_REQUEST)
        })
    })

    describe('run() — output guardrail blocking', () => {
        it('throws AgentGuardrailError when output guardrail blocks', async () => {
            const blockOutputGuardrail: GuardrailInterface = {
                id: 'block-output-guardrail',
                async *checkInput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkOutput() {
                    return { action: GUARDRAIL_ACTION.BLOCK, reason: 'bad output' }
                },
                async *checkToolCall() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                }
            }
            const provider = makeProvider()
            provider.respondWith(textResponse('harmful content'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ guardrails: [blockOutputGuardrail] })
            )
            const { error } = await collectEvents(agent, 'hello')
            expect(error).toBeInstanceOf(AgentGuardrailError)
        })
    })

    describe('run() — strategy exhausted without DONE', () => {
        it('completes without error when strategy returns without yielding DONE', async () => {
            const earlyReturnStrategy: ThinkingStrategyInterface = {
                name: 'EarlyReturn',
                systemPrompt: '',
                async *execute(_input: StrategyInput): AsyncGenerator<StrategyDecision, void, ToolResult | undefined> {
                    yield { type: STRATEGY_DECISION.MESSAGE_DELTA, delta: 'hi' }
                    yield { type: STRATEGY_DECISION.MESSAGE, content: 'hi' }
                    yield { type: STRATEGY_DECISION.ITERATION }
                }
            }
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider, thinkingStrategy: earlyReturnStrategy }),
                makeAgentDependencies()
            )
            const { events, error } = await collectEvents(agent, 'hello')
            expect(error).toBeUndefined()
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.MESSAGE)
        })
    })

    describe('stop()', () => {
        it('calls guardrailResolver.abort when stopping a running session', async () => {
            const guardrailResolver = makeGuardrailResolver()
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies({ guardrailResolver }))
            const session = makeSession()
            const runIterable = agent.run('hello', session)
            const iter = runIterable[Symbol.asyncIterator]()
            const first = await iter.next()
            expect(first.done).toBe(false)
            await agent.stop(session.id)
            expect(guardrailResolver.abort).toHaveBeenCalledWith(session.id)
            for await (const _ of runIterable);
        })

        it('stops cleanly when aborted mid-iteration, before the strategy yields ITERATION', async () => {
            const pausableStrategy: ThinkingStrategyInterface = {
                name: 'PausableStrategy',
                systemPrompt: '',
                async *execute(_input: StrategyInput): AsyncGenerator<StrategyDecision, void, ToolResult | undefined> {
                    yield { type: STRATEGY_DECISION.THINKING_DELTA, delta: 'thinking' }
                    yield { type: STRATEGY_DECISION.MESSAGE_DELTA, delta: 'done' }
                    yield { type: STRATEGY_DECISION.MESSAGE, content: 'done' }
                    yield { type: STRATEGY_DECISION.ITERATION }
                    yield { type: STRATEGY_DECISION.DONE }
                }
            }
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider, thinkingStrategy: pausableStrategy }),
                makeAgentDependencies()
            )
            const session = makeSession()
            const runIterable = agent.run('hello', session)
            const iter = runIterable[Symbol.asyncIterator]()
            const first = await iter.next()
            expect(first.done).toBe(false)
            await agent.stop(session.id)
            const second = await iter.next()
            expect(second.done).toBe(true)
        })

        it('stops cleanly when aborted before any iteration span was opened (during input guardrail check)', async () => {
            const interactiveGuardrail = makeInteractiveGuardrail('interactive', 'checkInput', 1)
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ guardrails: [interactiveGuardrail] })
            )
            const session = makeSession()
            const runIterable = agent.run('hello', session)
            const iter = runIterable[Symbol.asyncIterator]()
            const first = await iter.next()
            expect(first.done).toBe(false)
            await agent.stop(session.id)
            const second = await iter.next()
            expect(second.done).toBe(true)
        })
    })

    describe('run() — forced tool calls', () => {
        it('executes a forced tool call before the strategy runs', async () => {
            const forcedTool = makeToolMock('forced_tool')
            const provider = makeProvider()
            provider.respondWith(textResponse('done'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ toolOrchestrator: makeDelegatingToolOrchestrator() })
            )
            const session = makeSession()
            const events: Array<AgentEvent> = []
            for await (const event of agent.run('hello', session, {
                forcedToolCalls: [{ tool: forcedTool, arguments: { x: 1 } }]
            })) {
                events.push(event)
            }
            expect(eventTypes(events)).toEqual([
                AGENT_EVENT_TYPE.TOOL_CALL_START,
                AGENT_EVENT_TYPE.TOOL_CALL,
                AGENT_EVENT_TYPE.TOOL_RESULT,
                AGENT_EVENT_TYPE.MESSAGE_DELTA,
                AGENT_EVENT_TYPE.MESSAGE,
                AGENT_EVENT_TYPE.ITERATION,
                AGENT_EVENT_TYPE.DONE
            ])
            expect(forcedTool.execute).toHaveBeenCalledWith({ x: 1 }, expect.any(String), session.id, undefined)
        })

        it('executes multiple forced tool calls in order', async () => {
            const toolA = makeToolMock('tool_a')
            const toolB = makeToolMock('tool_b')
            const provider = makeProvider()
            provider.respondWith(textResponse('done'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ toolOrchestrator: makeDelegatingToolOrchestrator() })
            )
            const session = makeSession()
            const events: Array<AgentEvent> = []
            for await (const event of agent.run('hello', session, {
                forcedToolCalls: [
                    { tool: toolA, arguments: {} },
                    { tool: toolB, arguments: {} }
                ]
            })) {
                events.push(event)
            }
            const toolCallEvents = events.filter(e => e.type === AGENT_EVENT_TYPE.TOOL_CALL)
            expect(toolCallEvents).toHaveLength(2)
            expect(toolA.execute).toHaveBeenCalled()
            expect(toolB.execute).toHaveBeenCalled()
        })

        it('bypasses tool call guardrails for a forced call when bypassGuardrails is true', async () => {
            const blockGuardrail: GuardrailInterface = {
                id: 'block-tool-call-guardrail',
                async *checkInput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkOutput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkToolCall() {
                    return { action: GUARDRAIL_ACTION.BLOCK, reason: 'should not run' }
                }
            }
            const forcedTool = makeToolMock('forced_tool')
            const provider = makeProvider()
            provider.respondWith(textResponse('done'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({
                    guardrails: [blockGuardrail],
                    toolOrchestrator: makeDelegatingToolOrchestrator()
                })
            )
            const session = makeSession()
            const events: Array<AgentEvent> = []
            for await (const event of agent.run('hello', session, {
                forcedToolCalls: [{ tool: forcedTool, arguments: {}, bypassGuardrails: true }]
            })) {
                events.push(event)
            }
            expect(forcedTool.execute).toHaveBeenCalled()
            const toolResultEvent = events.find(e => e.type === AGENT_EVENT_TYPE.TOOL_RESULT)
            if (toolResultEvent?.type !== AGENT_EVENT_TYPE.TOOL_RESULT) throw new Error()
            expect(toolResultEvent.toolResult.isError).toBe(false)
        })

        it('does not bypass tool call guardrails for a forced call by default', async () => {
            const blockGuardrail: GuardrailInterface = {
                id: 'block-tool-call-guardrail',
                async *checkInput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkOutput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkToolCall() {
                    return { action: GUARDRAIL_ACTION.BLOCK, reason: 'blocked' }
                }
            }
            const forcedTool = makeToolMock('forced_tool')
            const provider = makeProvider()
            provider.respondWith(textResponse('done'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ guardrails: [blockGuardrail] })
            )
            const session = makeSession()
            const events: Array<AgentEvent> = []
            for await (const event of agent.run('hello', session, {
                forcedToolCalls: [{ tool: forcedTool, arguments: {} }]
            })) {
                events.push(event)
            }
            expect(forcedTool.execute).not.toHaveBeenCalled()
            const toolResultEvent = events.find(e => e.type === AGENT_EVENT_TYPE.TOOL_RESULT)
            if (toolResultEvent?.type !== AGENT_EVENT_TYPE.TOOL_RESULT) throw new Error()
            expect(toolResultEvent.toolResult.isError).toBe(true)
            expect(toolResultEvent.toolResult.output).toBe('blocked')
        })

        it('serializes a non-string forced tool output as JSON in the session message', async () => {
            const forcedTool = makeToolMock('forced_tool')
            ;(forcedTool.execute as jest.Mock).mockResolvedValue({ count: 3 })
            const provider = makeProvider()
            provider.respondWith(textResponse('done'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ toolOrchestrator: makeDelegatingToolOrchestrator() })
            )
            const session = makeSession()
            const events: Array<AgentEvent> = []
            for await (const event of agent.run('hello', session, {
                forcedToolCalls: [{ tool: forcedTool, arguments: {} }]
            })) {
                events.push(event)
            }
            const toolResultEvent = events.find(e => e.type === AGENT_EVENT_TYPE.TOOL_RESULT)
            if (toolResultEvent?.type !== AGENT_EVENT_TYPE.TOOL_RESULT) throw new Error()
            expect(toolResultEvent.toolResult.output).toEqual({ count: 3 })
        })
    })

    describe('run() — non-string tool output', () => {
        it('serializes a non-string tool output as JSON in the session message', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', {}))
            provider.respondWith(textResponse('done'))
            const orchestrator = makeToolOrchestrator({
                id: 'call-1',
                name: 'search',
                output: { count: 3 },
                isError: false
            })
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ toolOrchestrator: orchestrator })
            )
            const { events } = await collectEvents(agent, 'search')
            const toolResultEvent = events.find(e => e.type === AGENT_EVENT_TYPE.TOOL_RESULT)
            if (toolResultEvent?.type !== AGENT_EVENT_TYPE.TOOL_RESULT) throw new Error()
            expect(toolResultEvent.toolResult.output).toEqual({ count: 3 })
        })
    })

    describe('run() — plan and step decisions', () => {
        function makePlanStrategy(): ThinkingStrategyInterface {
            return {
                name: 'PlanTest',
                systemPrompt: '',
                async *execute(_input: StrategyInput): AsyncGenerator<StrategyDecision, void, ToolResult | undefined> {
                    yield {
                        type: STRATEGY_DECISION.PLAN,
                        plan: { steps: [{ id: '1', description: 'Do X', status: 'pending' }] }
                    }
                    yield { type: STRATEGY_DECISION.STEP_STARTED, stepId: '1', description: 'Do X' }
                    yield { type: STRATEGY_DECISION.STEP_COMPLETED, stepId: '1', result: 'ok' }
                    yield { type: STRATEGY_DECISION.STEP_FAILED, stepId: '1', error: 'retry needed' }
                    yield { type: STRATEGY_DECISION.MESSAGE_DELTA, delta: 'done' }
                    yield { type: STRATEGY_DECISION.MESSAGE, content: 'done' }
                    yield { type: STRATEGY_DECISION.ITERATION }
                    yield { type: STRATEGY_DECISION.DONE }
                }
            }
        }

        it('emits PLAN, STEP_STARTED, STEP_COMPLETED and STEP_FAILED events', async () => {
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider, thinkingStrategy: makePlanStrategy() }),
                makeAgentDependencies()
            )
            const { events } = await collectEvents(agent, 'hello')
            expect(eventTypes(events)).toEqual(
                expect.arrayContaining([
                    AGENT_EVENT_TYPE.PLAN,
                    AGENT_EVENT_TYPE.STEP_STARTED,
                    AGENT_EVENT_TYPE.STEP_COMPLETED,
                    AGENT_EVENT_TYPE.STEP_FAILED
                ])
            )
        })

        it('STEP_FAILED event carries the error message', async () => {
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider, thinkingStrategy: makePlanStrategy() }),
                makeAgentDependencies()
            )
            const { events } = await collectEvents(agent, 'hello')
            const stepFailed = events.find(e => e.type === AGENT_EVENT_TYPE.STEP_FAILED)
            if (stepFailed?.type !== AGENT_EVENT_TYPE.STEP_FAILED) throw new Error()
            expect(stepFailed.error).toBe('retry needed')
        })
    })

    describe('run() — ITERATION with usage', () => {
        it('includes usage in the ITERATION event and updates session usage', async () => {
            const usage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
            const usageStrategy: ThinkingStrategyInterface = {
                name: 'UsageTest',
                systemPrompt: '',
                async *execute(_input: StrategyInput): AsyncGenerator<StrategyDecision, void, ToolResult | undefined> {
                    yield { type: STRATEGY_DECISION.MESSAGE_DELTA, delta: 'hi' }
                    yield { type: STRATEGY_DECISION.MESSAGE, content: 'hi' }
                    yield { type: STRATEGY_DECISION.ITERATION, usage }
                    yield { type: STRATEGY_DECISION.DONE }
                }
            }
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider, thinkingStrategy: usageStrategy }),
                makeAgentDependencies()
            )
            const session = makeSession()
            const events: Array<AgentEvent> = []
            for await (const event of agent.run('hello', session)) {
                events.push(event)
            }
            const iterationEvent = events.find(e => e.type === AGENT_EVENT_TYPE.ITERATION)
            if (iterationEvent?.type !== AGENT_EVENT_TYPE.ITERATION) throw new Error()
            expect(iterationEvent.usage).toEqual(usage)
            expect(session.usage).toEqual(usage)
        })
    })

    describe('run() — guardrail run policy modes', () => {
        it('skips input guardrails entirely when policy is SKIP', async () => {
            const blockInputGuardrail: GuardrailInterface = {
                id: 'block-input-guardrail',
                async *checkInput() {
                    return { action: GUARDRAIL_ACTION.BLOCK, reason: 'should be skipped' }
                },
                async *checkOutput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkToolCall() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                }
            }
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ guardrails: [blockInputGuardrail] })
            )
            const session = makeSession()
            const events: Array<AgentEvent> = []
            for await (const event of agent.run('hello', session, {
                guardrailPolicy: { input: GUARDRAIL_CHECK_MODE.SKIP }
            })) {
                events.push(event)
            }
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.DONE)
        })

        it('skips output guardrails entirely when policy is SKIP', async () => {
            const blockOutputGuardrail: GuardrailInterface = {
                id: 'block-output-guardrail',
                async *checkInput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkOutput() {
                    return { action: GUARDRAIL_ACTION.BLOCK, reason: 'should be skipped' }
                },
                async *checkToolCall() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                }
            }
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ guardrails: [blockOutputGuardrail] })
            )
            const session = makeSession()
            const events: Array<AgentEvent> = []
            for await (const event of agent.run('hello', session, {
                guardrailPolicy: { output: GUARDRAIL_CHECK_MODE.SKIP }
            })) {
                events.push(event)
            }
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.DONE)
        })

        it('skips tool call guardrails entirely when policy is SKIP', async () => {
            const blockToolGuardrail: GuardrailInterface = {
                id: 'block-tool-guardrail',
                async *checkInput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkOutput() {
                    return { action: GUARDRAIL_ACTION.ALLOW }
                },
                async *checkToolCall() {
                    return { action: GUARDRAIL_ACTION.BLOCK, reason: 'should be skipped' }
                }
            }
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', {}))
            provider.respondWith(textResponse('done'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ guardrails: [blockToolGuardrail] })
            )
            const session = makeSession()
            const events: Array<AgentEvent> = []
            for await (const event of agent.run('search', session, {
                guardrailPolicy: { toolCall: GUARDRAIL_CHECK_MODE.SKIP }
            })) {
                events.push(event)
            }
            const toolResultEvent = events.find(e => e.type === AGENT_EVENT_TYPE.TOOL_RESULT)
            if (toolResultEvent?.type !== AGENT_EVENT_TYPE.TOOL_RESULT) throw new Error()
            expect(toolResultEvent.toolResult.isError).toBe(false)
        })

        it('immediately allows via SAFE_SKIP without emitting GUARDRAIL_REQUEST, even for an interactive guardrail', async () => {
            const interactiveGuardrail = makeInteractiveGuardrail('interactive', 'checkInput', 1)
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ guardrails: [interactiveGuardrail] })
            )
            const session = makeSession()
            const events: Array<AgentEvent> = []
            for await (const event of agent.run('hello', session, {
                guardrailPolicy: { input: GUARDRAIL_CHECK_MODE.SAFE_SKIP }
            })) {
                events.push(event)
            }
            expect(eventTypes(events)).not.toContain(AGENT_EVENT_TYPE.GUARDRAIL_REQUEST)
            expect(eventTypes(events)).toContain(AGENT_EVENT_TYPE.DONE)
        })

        it('throws AgentGuardrailDecisionRequiredError via FAIL mode instead of yielding GUARDRAIL_REQUEST', async () => {
            const interactiveGuardrail = makeInteractiveGuardrail('interactive', 'checkInput', 1)
            const provider = makeProvider()
            provider.setFallback(() => textResponse('ok'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ guardrails: [interactiveGuardrail] })
            )
            const session = makeSession()
            const events: Array<AgentEvent> = []
            let caught: unknown
            try {
                for await (const event of agent.run('hello', session, {
                    guardrailPolicy: { input: GUARDRAIL_CHECK_MODE.FAIL }
                })) {
                    events.push(event)
                }
            } catch (e) {
                caught = e
            }
            expect(caught).toBeInstanceOf(AgentGuardrailDecisionRequiredError)
            expect(eventTypes(events)).not.toContain(AGENT_EVENT_TYPE.GUARDRAIL_REQUEST)
        })

        it('immediately allows a tool call via SAFE_SKIP without emitting GUARDRAIL_REQUEST', async () => {
            const interactiveGuardrail = makeInteractiveGuardrail('interactive', 'checkToolCall', 1)
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', {}))
            provider.respondWith(textResponse('done'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ guardrails: [interactiveGuardrail] })
            )
            const session = makeSession()
            const events: Array<AgentEvent> = []
            for await (const event of agent.run('search', session, {
                guardrailPolicy: { toolCall: GUARDRAIL_CHECK_MODE.SAFE_SKIP }
            })) {
                events.push(event)
            }
            expect(eventTypes(events)).not.toContain(AGENT_EVENT_TYPE.GUARDRAIL_REQUEST)
            const toolResultEvent = events.find(e => e.type === AGENT_EVENT_TYPE.TOOL_RESULT)
            if (toolResultEvent?.type !== AGENT_EVENT_TYPE.TOOL_RESULT) throw new Error()
            expect(toolResultEvent.toolResult.isError).toBe(false)
        })

        it('throws AgentGuardrailDecisionRequiredError for a tool call via FAIL mode', async () => {
            const interactiveGuardrail = makeInteractiveGuardrail('interactive', 'checkToolCall', 1)
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', {}))
            provider.setFallback(() => textResponse('done'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({ guardrails: [interactiveGuardrail] })
            )
            const session = makeSession()
            const events: Array<AgentEvent> = []
            let caught: unknown
            try {
                for await (const event of agent.run('search', session, {
                    guardrailPolicy: { toolCall: GUARDRAIL_CHECK_MODE.FAIL }
                })) {
                    events.push(event)
                }
            } catch (e) {
                caught = e
            }
            expect(caught).toBeInstanceOf(AgentGuardrailDecisionRequiredError)
            expect(eventTypes(events)).not.toContain(AGENT_EVENT_TYPE.GUARDRAIL_REQUEST)
        })
    })

    describe('run() — tool call guardrail auto-approve cascade', () => {
        it('auto-resolves a second interactive guardrail once an earlier one is approved', async () => {
            const firstGuardrail = makeInteractiveGuardrail('first', 'checkToolCall', 1)
            const secondGuardrail = makeInteractiveGuardrail('second', 'checkToolCall', 2)
            const thirdGuardrail = makeInteractiveGuardrail('third', 'checkToolCall', 1)
            const guardrailResolver = makeGuardrailResolver()
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', {}))
            provider.respondWith(textResponse('done'))
            const agent = new Agent(
                makeAgentConfig({ provider }),
                makeAgentDependencies({
                    guardrails: [firstGuardrail, secondGuardrail, thirdGuardrail],
                    guardrailResolver
                })
            )
            const { events, error } = await collectEvents(agent, 'search')
            expect(error).toBeUndefined()
            expect(guardrailResolver.resolve).toHaveBeenCalled()
            const toolResultEvent = events.find(e => e.type === AGENT_EVENT_TYPE.TOOL_RESULT)
            if (toolResultEvent?.type !== AGENT_EVENT_TYPE.TOOL_RESULT) throw new Error()
            expect(toolResultEvent.toolResult.isError).toBe(false)
        })
    })

    describe('run() — working directory prompt', () => {
        it('includes the working directory in the system prompt when set on the session', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const session = makeSession()
            session.setWorkingDirectory('/workspace/project')
            for await (const _ of agent.run('hello', session));
            const systemMessages = session.getMessages().filter(m => m.role === 'system')
            expect(
                systemMessages.some(m => typeof m.content === 'string' && m.content.includes('/workspace/project'))
            ).toBe(true)
        })
    })

    describe('run() — rebuilding system prompts on a session with prior messages', () => {
        it('filters out prior non-system messages before rebuilding, keeping them in the final message list', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('second reply'))
            const agent = new Agent(makeAgentConfig({ provider }), makeAgentDependencies())
            const session = makeSession()
            session.addMessage({ id: 'prior-1', role: 'user', content: 'first message', createdAt: Date.now() })
            for await (const _ of agent.run('second message', session));
            const messages = session.getMessages()
            const priorMessage = messages.find(m => m.id === 'prior-1')
            expect(priorMessage).toBeDefined()
        })
    })
})
