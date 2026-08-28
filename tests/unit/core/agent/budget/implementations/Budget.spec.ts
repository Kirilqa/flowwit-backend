import { Budget } from '@agent/budget/implementations/Budget'
import { ModelPricing, Usage } from '@provider'

const basicUsage: Usage = {
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150
}

const pricing: ModelPricing = {
    inputPer1K: 3.0,
    outputPer1K: 15.0,
    currency: 'USD'
}

describe('Budget', () => {
    describe('initialize()', () => {
        it('resets all counters to zero', () => {
            const budget = new Budget({ maxTokens: 1000 })
            budget.initialize()
            budget.trackTokens(basicUsage)
            budget.trackToolCall()
            budget.trackIteration()
            budget.initialize()
            const state = budget.getState()
            expect(state.usedTokens).toBe(0)
            expect(state.usedToolCalls).toBe(0)
            expect(state.usedIterations).toBe(0)
            expect(state.usedCostUsd).toBe(0)
        })
    })

    describe('getState()', () => {
        it('returns all-zero state after initialize', () => {
            const budget = new Budget({})
            budget.initialize()
            const state = budget.getState()
            expect(state.usedTokens).toBe(0)
            expect(state.usedIterations).toBe(0)
            expect(state.usedToolCalls).toBe(0)
            expect(state.usedCostUsd).toBe(0)
        })

        it('returns non-negative elapsedMs', () => {
            const budget = new Budget({})
            budget.initialize()
            expect(budget.getState().elapsedMs).toBeGreaterThanOrEqual(0)
        })
    })

    describe('trackTokens()', () => {
        it('accumulates total token count across calls', () => {
            const budget = new Budget({})
            budget.initialize()
            budget.trackTokens({ promptTokens: 100, completionTokens: 50, totalTokens: 150 })
            budget.trackTokens({ promptTokens: 200, completionTokens: 100, totalTokens: 300 })
            expect(budget.getState().usedTokens).toBe(450)
        })

        it('calculates cost using pricing when provided', () => {
            const budget = new Budget({})
            budget.initialize(pricing)
            budget.trackTokens({ promptTokens: 100, completionTokens: 50, totalTokens: 150 })
            expect(budget.getState().usedCostUsd).toBeCloseTo(1.05)
        })

        it('calculates cost including cache tokens', () => {
            const budget = new Budget({})
            budget.initialize({
                inputPer1K: 0,
                outputPer1K: 0,
                cacheWritePer1K: 2.0,
                cacheReadPer1K: 1.0,
                currency: 'USD'
            })
            budget.trackTokens({
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                cacheWriteTokens: 1000,
                cacheReadTokens: 2000
            })
            expect(budget.getState().usedCostUsd).toBeCloseTo(4.0)
        })

        it('calculates reasoning cost when reasoningTokens and reasoningPer1K are provided', () => {
            const budget = new Budget({})
            budget.initialize({
                inputPer1K: 0,
                outputPer1K: 0,
                reasoningPer1K: 4.0,
                currency: 'USD'
            })
            budget.trackTokens({
                promptTokens: 0,
                completionTokens: 0,
                totalTokens: 0,
                reasoningTokens: 1000
            })
            expect(budget.getState().usedCostUsd).toBeCloseTo(4.0)
        })

        it('does not accumulate cost when no pricing is provided', () => {
            const budget = new Budget({})
            budget.initialize()
            budget.trackTokens({ promptTokens: 1000, completionTokens: 1000, totalTokens: 2000 })
            expect(budget.getState().usedCostUsd).toBe(0)
        })
    })

    describe('trackToolCall()', () => {
        it('increments tool call count with each call', () => {
            const budget = new Budget({})
            budget.initialize()
            budget.trackToolCall()
            budget.trackToolCall()
            expect(budget.getState().usedToolCalls).toBe(2)
        })
    })

    describe('trackIteration()', () => {
        it('increments iteration count with each call', () => {
            const budget = new Budget({})
            budget.initialize()
            budget.trackIteration()
            budget.trackIteration()
            budget.trackIteration()
            expect(budget.getState().usedIterations).toBe(3)
        })
    })

    describe('check()', () => {
        it('returns not exceeded when no limits are configured', () => {
            const budget = new Budget({})
            budget.initialize()
            expect(budget.check()).toEqual({ exceeded: false })
        })

        it('returns not exceeded when usage is below all limits', () => {
            const budget = new Budget({ maxTokens: 1000, maxIterations: 10, maxToolCalls: 5 })
            budget.initialize()
            budget.trackTokens({ promptTokens: 100, completionTokens: 50, totalTokens: 150 })
            budget.trackIteration()
            budget.trackToolCall()
            expect(budget.check().exceeded).toBe(false)
        })

        it('returns exceeded with reason when maxTokens is reached', () => {
            const budget = new Budget({ maxTokens: 100 })
            budget.initialize()
            budget.trackTokens({ promptTokens: 60, completionTokens: 40, totalTokens: 100 })
            const result = budget.check()
            expect(result.exceeded).toBe(true)
            expect(result.reason).toContain('Token limit exceeded')
        })

        it('is not exceeded when tokens are one below maxTokens', () => {
            const budget = new Budget({ maxTokens: 100 })
            budget.initialize()
            budget.trackTokens({ promptTokens: 59, completionTokens: 40, totalTokens: 99 })
            expect(budget.check().exceeded).toBe(false)
        })

        it('returns exceeded with reason when maxIterations is reached', () => {
            const budget = new Budget({ maxIterations: 3 })
            budget.initialize()
            budget.trackIteration()
            budget.trackIteration()
            budget.trackIteration()
            const result = budget.check()
            expect(result.exceeded).toBe(true)
            expect(result.reason).toContain('Iteration limit exceeded')
        })

        it('returns exceeded with reason when maxToolCalls is reached', () => {
            const budget = new Budget({ maxToolCalls: 2 })
            budget.initialize()
            budget.trackToolCall()
            budget.trackToolCall()
            const result = budget.check()
            expect(result.exceeded).toBe(true)
            expect(result.reason).toContain('Tool call limit exceeded')
        })

        it('returns exceeded with reason when maxCostUsd is reached', () => {
            const budget = new Budget({ maxCostUsd: 1.0 })
            budget.initialize({ inputPer1K: 10.0, outputPer1K: 0, currency: 'USD' })
            budget.trackTokens({ promptTokens: 100, completionTokens: 0, totalTokens: 100 })
            const result = budget.check()
            expect(result.exceeded).toBe(true)
            expect(result.reason).toContain('Cost limit exceeded')
        })

        it('returns exceeded with reason when maxDurationMs is reached', () => {
            jest.useFakeTimers()
            const budget = new Budget({ maxDurationMs: 5000 })
            budget.initialize()
            jest.advanceTimersByTime(5000)
            const result = budget.check()
            jest.useRealTimers()
            expect(result.exceeded).toBe(true)
            expect(result.reason).toContain('Duration limit exceeded')
        })

        it('checks token limit before iteration limit', () => {
            const budget = new Budget({ maxTokens: 100, maxIterations: 1 })
            budget.initialize()
            budget.trackTokens({ promptTokens: 60, completionTokens: 40, totalTokens: 100 })
            budget.trackIteration()
            const result = budget.check()
            expect(result.reason).toContain('Token limit exceeded')
        })
    })
})
