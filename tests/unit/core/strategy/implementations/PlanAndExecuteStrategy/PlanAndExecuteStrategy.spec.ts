import {
    PlanAndExecuteStrategyError,
    PLAN_AND_EXECUTE_STRATEGY_SYSTEM_PROMPT,
    STRATEGY_DECISION,
    StrategyDecision,
    StrategyInput,
    ThinkingStrategyInterface
} from '@strategy'
import { PlanAndExecuteStrategy } from '@strategy/implementations/PlanAndExecuteStrategy/PlanAndExecuteStrategy'
import { ToolResult } from '@tool'
import { Message, MESSAGE_ROLE } from '@provider'
import { makeProvider, TestProvider, TEST_MODEL, textResponse } from '../../../../../helpers/TestProvider'

function messageDecision(content: string): StrategyDecision {
    return { type: STRATEGY_DECISION.MESSAGE, content }
}

function toolCallDecision(id: string, name: string, args: Record<string, unknown> = {}): StrategyDecision {
    return { type: STRATEGY_DECISION.TOOL_CALL, toolCall: { id, name, arguments: args } }
}

function makeFakeReActStrategy(scripts: Array<Array<StrategyDecision>>): ThinkingStrategyInterface {
    let callIndex = 0
    return {
        name: 'FakeReAct',
        systemPrompt: '',
        async *execute(_input: StrategyInput) {
            const script = scripts[callIndex]
            callIndex++
            if (script === undefined) {
                throw new Error(`FakeReAct: no script queued for call #${callIndex}`)
            }
            for (const decision of script) {
                yield decision
            }
        }
    }
}

function jsonResponse(value: unknown) {
    return textResponse(JSON.stringify(value))
}

async function runStrategy(
    strategy: PlanAndExecuteStrategy,
    provider: TestProvider,
    messages: Array<Message> = [{ role: MESSAGE_ROLE.USER, content: 'do the task' }]
): Promise<Array<StrategyDecision>> {
    const generate = (msgs: Array<Message>, options?: Record<string, unknown>) =>
        provider.generateStream({ model: TEST_MODEL, messages: msgs, ...options })
    const gen = strategy.execute({ messages: [...messages], generate })
    const decisions: Array<StrategyDecision> = []
    let next: ToolResult | undefined = undefined

    while (true) {
        const step = await gen.next(next)
        if (step.done) break
        const decision = step.value
        decisions.push(decision)
        next = undefined
        if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
            next = { id: decision.toolCall.id, name: decision.toolCall.name, output: 'ok', isError: false }
        }
    }

    return decisions
}

function types(decisions: Array<StrategyDecision>): Array<string> {
    return decisions.map(d => d.type)
}

function findDecision<TType extends StrategyDecision['type']>(
    decisions: Array<StrategyDecision>,
    type: TType
): Extract<StrategyDecision, { type: TType }> {
    const found = decisions.find(d => d.type === type)
    if (found === undefined) {
        throw new Error(`Expected to find a decision of type "${type}"`)
    }
    return found as Extract<StrategyDecision, { type: TType }>
}

describe('PlanAndExecuteStrategy', () => {
    describe('constructor', () => {
        it('has name "PlanAndExecute"', () => {
            const strategy = new PlanAndExecuteStrategy(makeFakeReActStrategy([]))
            expect(strategy.name).toBe('PlanAndExecute')
        })

        it('exposes the plan-and-execute system prompt', () => {
            const strategy = new PlanAndExecuteStrategy(makeFakeReActStrategy([]))
            expect(strategy.systemPrompt).toBe(PLAN_AND_EXECUTE_STRATEGY_SYSTEM_PROMPT)
        })
    })

    describe('preparation phase', () => {
        it('finishes with the preparation message and no plan when the gate returns direct_response', async () => {
            const reAct = makeFakeReActStrategy([[messageDecision('Already answered in prep')]])
            const provider = makeProvider()
            provider.respondWith(jsonResponse({ status: 'direct_response' }))
            const strategy = new PlanAndExecuteStrategy(reAct)

            const decisions = await runStrategy(strategy, provider)

            expect(types(decisions)).toEqual([
                STRATEGY_DECISION.MESSAGE,
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.DONE
            ])
            expect(findDecision(decisions, STRATEGY_DECISION.MESSAGE).content).toBe('Already answered in prep')
        })

        it('falls back to a generated final message when preparation produced no message', async () => {
            const reAct = makeFakeReActStrategy([[]])
            const provider = makeProvider()
            provider.respondWith(jsonResponse({ status: 'waiting_for_user' }))
            provider.respondWith(textResponse('Please clarify X'))
            const strategy = new PlanAndExecuteStrategy(reAct)

            const decisions = await runStrategy(strategy, provider)

            expect(types(decisions)).toEqual([
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.MESSAGE,
                STRATEGY_DECISION.DONE
            ])
            expect(findDecision(decisions, STRATEGY_DECISION.MESSAGE).content).toBe('Please clarify X')
        })
    })

    describe('golden path', () => {
        it('builds a plan, executes its single step, and finalizes with a summary', async () => {
            const reAct = makeFakeReActStrategy([[], [messageDecision('Created the file')]])
            const provider = makeProvider()
            provider.respondWith(jsonResponse({ status: 'proceed_to_plan' }))
            provider.respondWith(jsonResponse({ steps: [{ description: 'Create the file' }] }))
            provider.respondWith(jsonResponse({ completedSteps: [{ stepId: '1', result: 'File created' }] }))
            provider.respondWith(textResponse('All done!'))
            const strategy = new PlanAndExecuteStrategy(reAct)

            const decisions = await runStrategy(strategy, provider)

            expect(types(decisions)).toEqual([
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.PLAN,
                STRATEGY_DECISION.STEP_STARTED,
                STRATEGY_DECISION.MESSAGE,
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.STEP_COMPLETED,
                STRATEGY_DECISION.PLAN,
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.MESSAGE,
                STRATEGY_DECISION.DONE
            ])

            const plan = findDecision(decisions, STRATEGY_DECISION.PLAN).plan
            expect(plan.steps).toEqual([
                { id: '1', description: 'Create the file', status: 'completed', result: 'File created' }
            ])

            const stepStarted = findDecision(decisions, STRATEGY_DECISION.STEP_STARTED)
            expect(stepStarted).toEqual({
                type: STRATEGY_DECISION.STEP_STARTED,
                stepId: '1',
                description: 'Create the file'
            })

            const stepCompleted = findDecision(decisions, STRATEGY_DECISION.STEP_COMPLETED)
            expect(stepCompleted).toEqual({
                type: STRATEGY_DECISION.STEP_COMPLETED,
                stepId: '1',
                result: 'File created'
            })

            const finalMessage = decisions[decisions.length - 2]
            expect(finalMessage).toEqual({ type: STRATEGY_DECISION.MESSAGE, content: 'All done!' })
        })

        it('confirms multiple steps from a single progress evaluation window', async () => {
            const reAct = makeFakeReActStrategy([[], [messageDecision('Did both steps')]])
            const provider = makeProvider()
            provider.respondWith(jsonResponse({ status: 'proceed_to_plan' }))
            provider.respondWith(jsonResponse({ steps: [{ description: 'Step A' }, { description: 'Step B' }] }))
            provider.respondWith(
                jsonResponse({
                    completedSteps: [
                        { stepId: '1', result: 'A done' },
                        { stepId: '2', result: 'B done' }
                    ]
                })
            )
            provider.respondWith(textResponse('Both done!'))
            const strategy = new PlanAndExecuteStrategy(reAct)

            const decisions = await runStrategy(strategy, provider)

            const completedDecisions = decisions.filter(d => d.type === STRATEGY_DECISION.STEP_COMPLETED)
            expect(completedDecisions).toHaveLength(2)

            const startedDecisions = decisions.filter(d => d.type === STRATEGY_DECISION.STEP_STARTED)
            expect(startedDecisions).toHaveLength(1)
        })

        it('bubbles a tool call from the step subtask and resumes after the tool result', async () => {
            const reAct = makeFakeReActStrategy([
                [],
                [toolCallDecision('call-1', 'read_file', { path: 'a.txt' }), messageDecision('Read the file')]
            ])
            const provider = makeProvider()
            provider.respondWith(jsonResponse({ status: 'proceed_to_plan' }))
            provider.respondWith(jsonResponse({ steps: [{ description: 'Read a file' }] }))
            provider.respondWith(jsonResponse({ completedSteps: [{ stepId: '1', result: 'Read' }] }))
            provider.respondWith(textResponse('Done reading!'))
            const strategy = new PlanAndExecuteStrategy(reAct)

            const decisions = await runStrategy(strategy, provider)

            expect(types(decisions)).toContain(STRATEGY_DECISION.TOOL_CALL)
            expect(findDecision(decisions, STRATEGY_DECISION.TOOL_CALL).toolCall).toEqual({
                id: 'call-1',
                name: 'read_file',
                arguments: { path: 'a.txt' }
            })
            expect(types(decisions)[types(decisions).length - 1]).toBe(STRATEGY_DECISION.DONE)
        })
    })

    describe('waiting for user during step execution', () => {
        it('exits after PLAN and DONE without a summary when the step already produced a message', async () => {
            const reAct = makeFakeReActStrategy([[], [messageDecision('Need your input')]])
            const provider = makeProvider()
            provider.respondWith(jsonResponse({ status: 'proceed_to_plan' }))
            provider.respondWith(jsonResponse({ steps: [{ description: 'Ask something' }] }))
            provider.respondWith(jsonResponse({ completedSteps: [], status: 'waiting_for_user' }))
            const strategy = new PlanAndExecuteStrategy(reAct)

            const decisions = await runStrategy(strategy, provider)

            expect(types(decisions)).toEqual([
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.PLAN,
                STRATEGY_DECISION.STEP_STARTED,
                STRATEGY_DECISION.MESSAGE,
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.PLAN,
                STRATEGY_DECISION.DONE
            ])
        })

        it('generates a fallback final message when the step produced no message', async () => {
            const reAct = makeFakeReActStrategy([[], []])
            const provider = makeProvider()
            provider.respondWith(jsonResponse({ status: 'proceed_to_plan' }))
            provider.respondWith(jsonResponse({ steps: [{ description: 'Ask something' }] }))
            provider.respondWith(jsonResponse({ completedSteps: [], status: 'waiting_for_user' }))
            provider.respondWith(textResponse('What should I do next?'))
            const strategy = new PlanAndExecuteStrategy(reAct)

            const decisions = await runStrategy(strategy, provider)

            expect(findDecision(decisions, STRATEGY_DECISION.MESSAGE).content).toBe('What should I do next?')
            expect(types(decisions)[types(decisions).length - 1]).toBe(STRATEGY_DECISION.DONE)
            expect(types(decisions)).not.toContain(STRATEGY_DECISION.STEP_COMPLETED)
        })
    })

    describe('step failure and replanning', () => {
        it('replans when the evaluator reports the step failed, then completes on the revised plan', async () => {
            const reAct = makeFakeReActStrategy([
                [],
                [messageDecision('Tried and failed')],
                [messageDecision('Retried, worked')]
            ])
            const provider = makeProvider()
            provider.respondWith(jsonResponse({ status: 'proceed_to_plan' }))
            provider.respondWith(jsonResponse({ steps: [{ description: 'Do the risky thing' }] }))
            provider.respondWith(jsonResponse({ completedSteps: [], status: 'failed', error: 'It exploded' }))
            provider.respondWith(jsonResponse({ steps: [{ description: 'Retry the thing safely' }] }))
            provider.respondWith(jsonResponse({ completedSteps: [{ stepId: '1', result: 'Worked this time' }] }))
            provider.respondWith(textResponse('Recovered and finished!'))
            const strategy = new PlanAndExecuteStrategy(reAct)

            const decisions = await runStrategy(strategy, provider)

            expect(types(decisions)).toContain(STRATEGY_DECISION.STEP_FAILED)
            const failed = findDecision(decisions, STRATEGY_DECISION.STEP_FAILED)
            expect(failed.error).toBe('It exploded')

            const planDecisions = decisions.filter(d => d.type === STRATEGY_DECISION.PLAN)
            expect(planDecisions).toHaveLength(3)
            const revisedPlan = planDecisions[1]
            if (revisedPlan?.type !== STRATEGY_DECISION.PLAN) throw new Error('expected PLAN')
            expect(revisedPlan.plan.steps[0]?.description).toBe('Retry the thing safely')

            expect(types(decisions)[types(decisions).length - 1]).toBe(STRATEGY_DECISION.DONE)
            expect(decisions[decisions.length - 2]).toEqual({
                type: STRATEGY_DECISION.MESSAGE,
                content: 'Recovered and finished!'
            })
        })

        it('fails a step after exhausting maxStepAttempts without evaluator confirmation, then replans', async () => {
            const reAct = makeFakeReActStrategy([
                [],
                [messageDecision('attempt 1')],
                [messageDecision('attempt 2')],
                [messageDecision('retry succeeds')]
            ])
            const provider = makeProvider()
            provider.respondWith(jsonResponse({ status: 'proceed_to_plan' }))
            provider.respondWith(jsonResponse({ steps: [{ description: 'Stubborn step' }] }))
            provider.respondWith(
                jsonResponse({ completedSteps: [], status: 'incomplete', missingWork: 'still working' })
            )
            provider.respondWith(
                jsonResponse({ completedSteps: [], status: 'incomplete', missingWork: 'still working' })
            )
            provider.respondWith(jsonResponse({ steps: [{ description: 'Simplified step' }] }))
            provider.respondWith(jsonResponse({ completedSteps: [{ stepId: '1', result: 'done' }] }))
            provider.respondWith(textResponse('Finally done!'))
            const strategy = new PlanAndExecuteStrategy(reAct, { maxStepAttempts: 2, maxStructuredOutputAttempts: 3 })

            const decisions = await runStrategy(strategy, provider)

            const failed = findDecision(decisions, STRATEGY_DECISION.STEP_FAILED)
            expect(failed.error).toContain('did not complete after 2 attempts')
            expect(types(decisions)[types(decisions).length - 1]).toBe(STRATEGY_DECISION.DONE)
        })
    })

    describe('structured output retries', () => {
        it('retries once on invalid JSON and succeeds on the second attempt', async () => {
            const reAct = makeFakeReActStrategy([[messageDecision('answer')]])
            const provider = makeProvider()
            provider.respondWith(textResponse('not valid json'))
            provider.respondWith(jsonResponse({ status: 'direct_response' }))
            const strategy = new PlanAndExecuteStrategy(reAct)

            const decisions = await runStrategy(strategy, provider)

            expect(types(decisions)[types(decisions).length - 1]).toBe(STRATEGY_DECISION.DONE)
            expect(provider.calls).toHaveLength(2)
        })

        it('throws PlanAndExecuteStrategyError after exhausting all structured output attempts', async () => {
            const reAct = makeFakeReActStrategy([[messageDecision('answer')]])
            const provider = makeProvider()
            provider.setFallback(() => textResponse('still not valid json'))
            const strategy = new PlanAndExecuteStrategy(reAct, { maxStructuredOutputAttempts: 2, maxStepAttempts: 3 })

            let caught: unknown
            try {
                await runStrategy(strategy, provider)
            } catch (error) {
                caught = error
            }

            expect(caught).toBeInstanceOf(PlanAndExecuteStrategyError)
            expect(caught).toHaveProperty('message', expect.stringContaining('after 2 attempts'))
        })

        it('retries when the response is valid JSON but fails schema validation', async () => {
            const reAct = makeFakeReActStrategy([[messageDecision('answer')]])
            const provider = makeProvider()
            provider.respondWith(jsonResponse({ status: 'not_a_real_status' }))
            provider.respondWith(jsonResponse({ status: 'direct_response' }))
            const strategy = new PlanAndExecuteStrategy(reAct)

            const decisions = await runStrategy(strategy, provider)

            expect(types(decisions)[types(decisions).length - 1]).toBe(STRATEGY_DECISION.DONE)
            expect(provider.calls).toHaveLength(2)
        })
    })

    describe('subtask tool call protocol', () => {
        it('throws when resumed without a tool result after a TOOL_CALL decision', async () => {
            const reAct = makeFakeReActStrategy([[], [toolCallDecision('call-1', 'read_file')]])
            const provider = makeProvider()
            provider.respondWith(jsonResponse({ status: 'proceed_to_plan' }))
            provider.respondWith(jsonResponse({ steps: [{ description: 'Read something' }] }))
            const strategy = new PlanAndExecuteStrategy(reAct)
            const generate = (msgs: Array<Message>, options?: Record<string, unknown>) =>
                provider.generateStream({ model: TEST_MODEL, messages: msgs, ...options })
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'go' }], generate })

            let step = await gen.next()
            while (!step.done && step.value.type !== STRATEGY_DECISION.TOOL_CALL) {
                step = await gen.next()
            }
            expect(step.done).toBe(false)

            await expect(gen.next(undefined)).rejects.toThrow(PlanAndExecuteStrategyError)
        })
    })

    describe('progress evaluation window handling', () => {
        it('starts the next step immediately when only part of the evaluation window is confirmed', async () => {
            const reAct = makeFakeReActStrategy([
                [],
                [messageDecision('did steps 1 and 2')],
                [messageDecision('did step 3')]
            ])
            const provider = makeProvider()
            provider.respondWith(jsonResponse({ status: 'proceed_to_plan' }))
            provider.respondWith(
                jsonResponse({
                    steps: [{ description: 'Step 1' }, { description: 'Step 2' }, { description: 'Step 3' }]
                })
            )
            provider.respondWith(
                jsonResponse({
                    completedSteps: [
                        { stepId: '1', result: 'a' },
                        { stepId: '2', result: 'b' }
                    ]
                })
            )
            provider.respondWith(jsonResponse({ completedSteps: [{ stepId: '3', result: 'c' }] }))
            provider.respondWith(textResponse('All three done!'))
            const strategy = new PlanAndExecuteStrategy(reAct)

            const decisions = await runStrategy(strategy, provider)

            expect(decisions.filter(d => d.type === STRATEGY_DECISION.STEP_STARTED)).toHaveLength(2)
            expect(decisions.filter(d => d.type === STRATEGY_DECISION.STEP_COMPLETED)).toHaveLength(3)
        })

        it('confirms nothing when the evaluator reports an out-of-order stepId, then succeeds on retry', async () => {
            const reAct = makeFakeReActStrategy([[], [messageDecision('attempt')], [messageDecision('retry')]])
            const provider = makeProvider()
            provider.respondWith(jsonResponse({ status: 'proceed_to_plan' }))
            provider.respondWith(jsonResponse({ steps: [{ description: 'Step 1' }, { description: 'Step 2' }] }))
            provider.respondWith(jsonResponse({ completedSteps: [{ stepId: '2', result: 'wrong order' }] }))
            provider.respondWith(
                jsonResponse({
                    completedSteps: [
                        { stepId: '1', result: 'correct' },
                        { stepId: '2', result: 'correct' }
                    ]
                })
            )
            provider.respondWith(textResponse('Done!'))
            const strategy = new PlanAndExecuteStrategy(reAct)

            const decisions = await runStrategy(strategy, provider)

            expect(decisions.filter(d => d.type === STRATEGY_DECISION.STEP_COMPLETED)).toHaveLength(2)
            expect(types(decisions)[types(decisions).length - 1]).toBe(STRATEGY_DECISION.DONE)
        })
    })
})
