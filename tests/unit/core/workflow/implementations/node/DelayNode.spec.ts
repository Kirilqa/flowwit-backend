import { WorkFlowNodeError } from '@workflow'
import { DelayNode } from '@workflow/implementations/node/DelayNode'
import { runNode } from '../../../../../helpers/runNode'

describe('DelayNode', () => {
    let node: DelayNode

    beforeEach(() => {
        node = new DelayNode()
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('has type "delay" and is not a start node', () => {
        expect(node.type).toBe('delay')
        expect(node.isStart).toBe(false)
    })

    describe('isReady', () => {
        it('returns true when value port is received', () => {
            expect(node.isReady(new Set(['value']))).toBe(true)
        })

        it('returns false when value port is not received', () => {
            expect(node.isReady(new Set())).toBe(false)
        })
    })

    describe('execute', () => {
        it('passes value through as result after delay', async () => {
            const promise = runNode(node.execute({ value: 'data' }, { delayMs: 500 }))
            jest.runAllTimers()
            const { result } = await promise
            expect(result.output['result']).toBe('data')
        })

        it('uses default delay of 1000ms when delayMs is not provided', async () => {
            const promise = runNode(node.execute({ value: 'data' }, {}))
            jest.advanceTimersByTime(999)
            const resolved = Promise.race([promise.then(() => 'resolved'), Promise.resolve('pending')])
            expect(await resolved).toBe('pending')
            jest.runAllTimers()
            await promise
        })

        it('completes after the specified delay', async () => {
            const promise = runNode(node.execute({ value: 'data' }, { delayMs: 2000 }))
            jest.advanceTimersByTime(2000)
            const { result } = await promise
            expect(result.output['result']).toBe('data')
        })

        it('emits no events', async () => {
            const promise = runNode(node.execute({ value: 'x' }, { delayMs: 100 }))
            jest.runAllTimers()
            const { events } = await promise
            expect(events).toHaveLength(0)
        })

        it('throws WorkFlowNodeError when delayMs is not a number', async () => {
            await expect(runNode(node.execute({ value: 'x' }, { delayMs: 'not-a-number' }))).rejects.toThrow(
                WorkFlowNodeError
            )
        })
    })
})
