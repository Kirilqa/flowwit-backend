import { z } from 'zod'
import { getErrorMessage } from '@core/utils'
import { Message, MESSAGE_ROLE, RESPONSE_FORMAT_TYPE, ResponseFormat } from '@provider'
import { ToolResult } from '@tool'
import { ThinkingStrategyInterface } from '../../interfaces'
import { STRATEGY_DECISION, StrategyDecision, StrategyInput } from '../../types'
import { aggregateTextStream, appendToolCallMessage, appendToolResultMessage } from '../../utils'
import { PlanAndExecuteStrategyError } from './errors'
import {
    buildPlanContextMessage,
    buildProgressEvaluationPrompt,
    buildReplanPrompt,
    buildStepExecutionPrompt,
    FALLBACK_RESPONSE_PROMPT,
    FINAL_SUMMARY_PROMPT,
    PLAN_AND_EXECUTE_STRATEGY_SYSTEM_PROMPT,
    PLAN_EXTRACTION_PROMPT,
    PREPARATION_GATE_PROMPT,
    PREPARATION_PROMPT
} from './prompts'
import {
    PLAN_STEP_STATUS,
    Plan,
    PlanAndExecuteStrategyConfig,
    PlanStep,
    PREPARATION_OUTCOME_STATUS,
    PreparationOutcomeResult,
    PROGRESS_EVALUATION_STATUS,
    ProgressEvaluationCompletedStep,
    ProgressEvaluationResult,
    STEP_EXECUTION_OUTCOME_STATUS,
    StepExecutionOutcome
} from './types'
import { flattenLeafSteps, hydratePlanDraft, stepContainsId } from './utils'
import { planDraftSchema, preparationOutcomeSchema, progressEvaluationSchema } from './validators'

const DEFAULT_CONFIG: PlanAndExecuteStrategyConfig = {
    maxStructuredOutputAttempts: 3,
    maxStepAttempts: 3
}

const PLAN_RESPONSE_FORMAT: ResponseFormat = {
    type: RESPONSE_FORMAT_TYPE.JSON_SCHEMA,
    name: 'plan',
    jsonSchema: z.toJSONSchema(planDraftSchema, { io: 'input' })
}

const PROGRESS_EVALUATION_RESPONSE_FORMAT: ResponseFormat = {
    type: RESPONSE_FORMAT_TYPE.JSON_SCHEMA,
    name: 'progress_evaluation',
    jsonSchema: z.toJSONSchema(progressEvaluationSchema, { io: 'input' })
}

const PREPARATION_OUTCOME_RESPONSE_FORMAT: ResponseFormat = {
    type: RESPONSE_FORMAT_TYPE.JSON_SCHEMA,
    name: 'preparation_outcome',
    jsonSchema: z.toJSONSchema(preparationOutcomeSchema)
}

export class PlanAndExecuteStrategy implements ThinkingStrategyInterface {
    readonly name = 'PlanAndExecute'
    readonly systemPrompt = PLAN_AND_EXECUTE_STRATEGY_SYSTEM_PROMPT

    private readonly reActStrategy: ThinkingStrategyInterface
    private readonly config: PlanAndExecuteStrategyConfig

    constructor(reActStrategy: ThinkingStrategyInterface, config: PlanAndExecuteStrategyConfig = DEFAULT_CONFIG) {
        this.reActStrategy = reActStrategy
        this.config = config
    }

    async *execute(input: StrategyInput): AsyncGenerator<StrategyDecision, void, ToolResult | undefined> {
        const messages: Array<Message> = [...input.messages]

        const preparationProducedMessage = yield* this.runSubtask(
            [...messages, { role: MESSAGE_ROLE.USER, content: PREPARATION_PROMPT }],
            messages,
            input
        )

        const preparationOutcome = yield* this.checkPreparationOutcome(messages, input)

        if (preparationOutcome.status !== PREPARATION_OUTCOME_STATUS.PROCEED_TO_PLAN) {
            if (!preparationProducedMessage) {
                yield* this.ensureFinalMessage(messages, input)
            }
            yield { type: STRATEGY_DECISION.DONE }
            return
        }

        let plan = yield* this.buildPlan(messages, input)

        yield { type: STRATEGY_DECISION.PLAN, plan }
        messages.push({ role: MESSAGE_ROLE.USER, content: buildPlanContextMessage(plan) })

        let leaves = flattenLeafSteps(plan.steps)
        let index = 0

        while (index < leaves.length) {
            const remainingLeaves = leaves.slice(index)
            const outcome = yield* this.advanceSteps(remainingLeaves, plan, messages, input)

            index += outcome.completedCount

            if (outcome.status === STEP_EXECUTION_OUTCOME_STATUS.WAITING_FOR_USER) {
                yield { type: STRATEGY_DECISION.PLAN, plan }
                yield { type: STRATEGY_DECISION.DONE }
                return
            }

            if (outcome.status === STEP_EXECUTION_OUTCOME_STATUS.FAILED) {
                const failedLeaf = leaves[index]

                if (failedLeaf === undefined) {
                    throw new PlanAndExecuteStrategyError('Cannot replan: no remaining leaf found at the failure point')
                }

                plan = yield* this.replan(plan, failedLeaf.id, outcome.error, messages, input)
                yield { type: STRATEGY_DECISION.PLAN, plan }
                messages.push({ role: MESSAGE_ROLE.USER, content: buildPlanContextMessage(plan, true) })

                leaves = flattenLeafSteps(plan.steps)
                const nextPendingIndex = leaves.findIndex(leaf => leaf.status !== PLAN_STEP_STATUS.COMPLETED)
                index = nextPendingIndex === -1 ? leaves.length : nextPendingIndex
                continue
            }
        }

        yield { type: STRATEGY_DECISION.PLAN, plan }
        yield* this.finalizeSummary(messages, input)
    }

    private async *runSubtask(
        taskMessages: Array<Message>,
        sharedMessages: Array<Message>,
        input: StrategyInput
    ): AsyncGenerator<StrategyDecision, boolean, ToolResult | undefined> {
        const subGenerator = this.reActStrategy.execute({ messages: taskMessages, generate: input.generate })
        let toolResult: ToolResult | undefined = undefined
        let producedMessage = false

        while (true) {
            const { value: decision, done } = await subGenerator.next(toolResult)

            if (done) return producedMessage

            toolResult = undefined

            if (decision.type === STRATEGY_DECISION.DONE) return producedMessage

            if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
                appendToolCallMessage(sharedMessages, decision.toolCall)
                const result = yield decision

                if (!result) {
                    throw new PlanAndExecuteStrategyError(
                        'Expected a tool result when resuming after a tool call decision'
                    )
                }

                appendToolResultMessage(sharedMessages, decision.toolCall, result)
                toolResult = result
                continue
            }

            if (decision.type === STRATEGY_DECISION.MESSAGE) {
                sharedMessages.push({ role: MESSAGE_ROLE.ASSISTANT, content: decision.content })
                producedMessage = true
            }

            yield decision
        }
    }

    private async *ensureFinalMessage(
        messages: Array<Message>,
        input: StrategyInput
    ): AsyncGenerator<StrategyDecision, void, ToolResult | undefined> {
        const fallbackMessages: Array<Message> = [
            ...messages,
            { role: MESSAGE_ROLE.USER, content: FALLBACK_RESPONSE_PROMPT }
        ]

        const { text, usage } = await aggregateTextStream(input.generate(fallbackMessages))

        yield { type: STRATEGY_DECISION.ITERATION, ...(usage !== undefined && { usage }) }

        yield { type: STRATEGY_DECISION.MESSAGE, content: text }
    }

    private async *checkPreparationOutcome(
        messages: Array<Message>,
        input: StrategyInput
    ): AsyncGenerator<StrategyDecision, PreparationOutcomeResult, ToolResult | undefined> {
        return yield* this.requestStructuredOutput(
            messages,
            PREPARATION_GATE_PROMPT,
            PREPARATION_OUTCOME_RESPONSE_FORMAT,
            preparationOutcomeSchema,
            input
        )
    }

    private async *buildPlan(
        messages: Array<Message>,
        input: StrategyInput
    ): AsyncGenerator<StrategyDecision, Plan, ToolResult | undefined> {
        const draft = yield* this.requestStructuredOutput(
            messages,
            PLAN_EXTRACTION_PROMPT,
            PLAN_RESPONSE_FORMAT,
            planDraftSchema,
            input
        )

        return { steps: hydratePlanDraft(draft.steps) }
    }

    private async *replan(
        plan: Plan,
        failedLeafId: string,
        error: string,
        messages: Array<Message>,
        input: StrategyInput
    ): AsyncGenerator<StrategyDecision, Plan, ToolResult | undefined> {
        const failedTopLevelIndex = plan.steps.findIndex(step => stepContainsId(step, failedLeafId))

        if (failedTopLevelIndex === -1) {
            throw new PlanAndExecuteStrategyError(`Cannot replan: step "${failedLeafId}" not found in the plan`)
        }

        const completedSteps = plan.steps.slice(0, failedTopLevelIndex)
        const remainingSteps = plan.steps.slice(failedTopLevelIndex)
        const failedStep = remainingSteps[0]

        if (failedStep === undefined) {
            throw new PlanAndExecuteStrategyError('Cannot replan: no remaining steps found at the failure point')
        }

        const remainingDescriptions = remainingSteps.map(step => step.description)

        const draft = yield* this.requestStructuredOutput(
            messages,
            buildReplanPrompt(remainingDescriptions, failedStep.description, error),
            PLAN_RESPONSE_FORMAT,
            planDraftSchema,
            input
        )

        const revisedSteps = hydratePlanDraft(draft.steps, completedSteps.length)

        return { steps: [...completedSteps, ...revisedSteps] }
    }

    private async *advanceSteps(
        remainingLeaves: Array<PlanStep>,
        plan: Plan,
        messages: Array<Message>,
        input: StrategyInput
    ): AsyncGenerator<StrategyDecision, StepExecutionOutcome, ToolResult | undefined> {
        const firstStep = remainingLeaves[0]

        if (firstStep === undefined) {
            throw new PlanAndExecuteStrategyError('advanceSteps called with no remaining leaves')
        }

        firstStep.status = PLAN_STEP_STATUS.IN_PROGRESS
        yield { type: STRATEGY_DECISION.STEP_STARTED, stepId: firstStep.id, description: firstStep.description }

        let frontierIndex = 0
        let continuationNote: string | undefined = undefined
        let attempt = 0

        while (frontierIndex < remainingLeaves.length) {
            attempt++

            const activeStep = remainingLeaves[frontierIndex]

            if (activeStep === undefined) break

            if (attempt > this.config.maxStepAttempts) {
                const error = `Step "${activeStep.description}" did not complete after ${this.config.maxStepAttempts} attempts`
                activeStep.status = PLAN_STEP_STATUS.FAILED
                activeStep.error = error
                yield { type: STRATEGY_DECISION.STEP_FAILED, stepId: activeStep.id, error }
                return { status: STEP_EXECUTION_OUTCOME_STATUS.FAILED, completedCount: frontierIndex, error }
            }

            const framing = buildStepExecutionPrompt(plan, activeStep, continuationNote)
            const taskMessages: Array<Message> = [...messages, { role: MESSAGE_ROLE.USER, content: framing }]

            const stepProducedMessage = yield* this.runSubtask(taskMessages, messages, input)

            const window = remainingLeaves.slice(frontierIndex)
            const progress = yield* this.evaluateProgress(window, messages, input)
            const confirmedInWindow = this.applyCompletedSteps(window, progress.completedSteps)

            for (const step of window.slice(0, confirmedInWindow)) {
                yield { type: STRATEGY_DECISION.STEP_COMPLETED, stepId: step.id, result: step.result ?? '' }
            }

            frontierIndex += confirmedInWindow

            if (frontierIndex >= remainingLeaves.length) {
                return { status: STEP_EXECUTION_OUTCOME_STATUS.COMPLETED, completedCount: frontierIndex }
            }

            if (confirmedInWindow > 0) {
                attempt = 0
                continuationNote = undefined

                const nextStep = remainingLeaves[frontierIndex]

                if (nextStep !== undefined) {
                    nextStep.status = PLAN_STEP_STATUS.IN_PROGRESS
                    yield {
                        type: STRATEGY_DECISION.STEP_STARTED,
                        stepId: nextStep.id,
                        description: nextStep.description
                    }
                }

                continue
            }

            if (progress.status === PROGRESS_EVALUATION_STATUS.WAITING_FOR_USER) {
                if (!stepProducedMessage) {
                    yield* this.ensureFinalMessage(messages, input)
                }
                return { status: STEP_EXECUTION_OUTCOME_STATUS.WAITING_FOR_USER, completedCount: frontierIndex }
            }

            if (progress.status === PROGRESS_EVALUATION_STATUS.FAILED) {
                const error = progress.error ?? `Step "${activeStep.description}" failed`
                activeStep.status = PLAN_STEP_STATUS.FAILED
                activeStep.error = error
                yield { type: STRATEGY_DECISION.STEP_FAILED, stepId: activeStep.id, error }
                return { status: STEP_EXECUTION_OUTCOME_STATUS.FAILED, completedCount: frontierIndex, error }
            }

            continuationNote = progress.missingWork
        }

        return { status: STEP_EXECUTION_OUTCOME_STATUS.COMPLETED, completedCount: frontierIndex }
    }

    private applyCompletedSteps(
        window: Array<PlanStep>,
        completedSteps: Array<ProgressEvaluationCompletedStep>
    ): number {
        let confirmed = 0

        for (const reported of completedSteps) {
            const expectedStep = window[confirmed]

            if (reported.stepId !== expectedStep?.id) {
                break
            }

            expectedStep.status = PLAN_STEP_STATUS.COMPLETED
            expectedStep.result = reported.result
            confirmed++
        }

        return confirmed
    }

    private async *evaluateProgress(
        window: Array<PlanStep>,
        messages: Array<Message>,
        input: StrategyInput
    ): AsyncGenerator<StrategyDecision, ProgressEvaluationResult, ToolResult | undefined> {
        return yield* this.requestStructuredOutput(
            messages,
            buildProgressEvaluationPrompt(window),
            PROGRESS_EVALUATION_RESPONSE_FORMAT,
            progressEvaluationSchema,
            input
        )
    }

    private async *finalizeSummary(
        messages: Array<Message>,
        input: StrategyInput
    ): AsyncGenerator<StrategyDecision, void, ToolResult | undefined> {
        const summaryMessages: Array<Message> = [
            ...messages,
            { role: MESSAGE_ROLE.USER, content: FINAL_SUMMARY_PROMPT }
        ]

        const { text, usage } = await aggregateTextStream(input.generate(summaryMessages))

        yield { type: STRATEGY_DECISION.ITERATION, ...(usage !== undefined && { usage }) }

        yield { type: STRATEGY_DECISION.MESSAGE, content: text }
        yield { type: STRATEGY_DECISION.DONE }
    }

    private async *requestStructuredOutput<TSchema extends z.ZodType>(
        baseMessages: Array<Message>,
        promptText: string,
        responseFormat: ResponseFormat,
        schema: TSchema,
        input: StrategyInput
    ): AsyncGenerator<StrategyDecision, z.infer<TSchema>, ToolResult | undefined> {
        let lastError: string | null = null

        for (let attempt = 1; attempt <= this.config.maxStructuredOutputAttempts; attempt++) {
            const retryNote =
                lastError === null
                    ? ''
                    : `\n\nYour previous attempt was rejected: ${lastError}\nFix the issue and return corrected JSON.`

            const requestMessages: Array<Message> = [
                ...baseMessages,
                { role: MESSAGE_ROLE.USER, content: promptText + retryNote }
            ]

            const { text, usage } = await aggregateTextStream(
                input.generate(requestMessages, { useTools: false, responseFormat })
            )

            yield { type: STRATEGY_DECISION.ITERATION, ...(usage !== undefined && { usage }) }

            const parsed = this.parseStructured(text, schema)

            if (parsed.success) {
                return parsed.data
            }

            lastError = parsed.error
        }

        throw new PlanAndExecuteStrategyError(
            `Failed to obtain valid structured output after ${this.config.maxStructuredOutputAttempts} attempts: ${lastError}`
        )
    }

    private parseStructured<TSchema extends z.ZodType>(
        text: string,
        schema: TSchema
    ): { success: true; data: z.infer<TSchema> } | { success: false; error: string } {
        let json: unknown

        try {
            json = JSON.parse(text)
        } catch (error) {
            return { success: false, error: `Invalid JSON: ${getErrorMessage(error)}` }
        }

        const result = schema.safeParse(json)

        if (!result.success) {
            return { success: false, error: result.error.message }
        }

        return { success: true, data: result.data }
    }
}
