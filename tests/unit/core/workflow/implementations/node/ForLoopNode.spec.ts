import { WorkFlowNodeError } from '@workflow'
import { ForLoopNode } from '@workflow/implementations/node/ForLoopNode'
import { runNode } from '../../../../../helpers/runNode'

describe('ForLoopNode', () => {
    let node: ForLoopNode

    beforeEach(() => {
        node = new ForLoopNode()
    })

    it('has type "for_loop" and is not a start node', () => {
        expect(node.type).toBe('for_loop')
        expect(node.isStart).toBe(false)
    })

    describe('isReady', () => {
        it('returns true when value port is received', () => {
            expect(node.isReady(new Set(['value']))).toBe(true)
        })

        it('returns true when loop port is received', () => {
            expect(node.isReady(new Set(['loop']))).toBe(true)
        })

        it('returns true when both ports are received', () => {
            expect(node.isReady(new Set(['value', 'loop']))).toBe(true)
        })

        it('returns false when neither port is received', () => {
            expect(node.isReady(new Set())).toBe(false)
        })
    })

    describe('execute', () => {
        it('emits loop output and executionId on first iteration', async () => {
            const { result } = await runNode(node.execute({ value: 'x' }, { iterations: 3 }, {}))
            expect(result.output['loop']).toBe('x')
            expect(result.executionIds?.['loop']).toBe(true)
            expect(result.state?.['iteration']).toBe(1)
        })

        it('continues looping while within iteration limit', async () => {
            const { result } = await runNode(node.execute({ loop: 'x' }, { iterations: 3 }, { iteration: 2 }))
            expect(result.output['loop']).toBe('x')
            expect(result.executionIds?.['loop']).toBe(true)
            expect(result.state?.['iteration']).toBe(3)
        })

        it('routes to done output after last iteration', async () => {
            const { result } = await runNode(node.execute({ loop: 'x' }, { iterations: 3 }, { iteration: 3 }))
            expect(result.output['done']).toBe('x')
            expect(result.executionIds).toBeUndefined()
            expect(result.state?.['iteration']).toBe(4)
        })

        it('prefers loop port over value port', async () => {
            const { result } = await runNode(node.execute({ value: 'ignored', loop: 'used' }, { iterations: 2 }, {}))
            expect(result.output['loop']).toBe('used')
        })

        it('emits no events', async () => {
            const { events } = await runNode(node.execute({ value: 'x' }, { iterations: 1 }, {}))
            expect(events).toHaveLength(0)
        })

        it('throws WorkFlowNodeError when iterations config is missing', async () => {
            await expect(runNode(node.execute({ value: 'x' }, {}, {}))).rejects.toThrow(WorkFlowNodeError)
        })

        it('throws WorkFlowNodeError when iterations is less than 1', async () => {
            await expect(runNode(node.execute({ value: 'x' }, { iterations: 0 }, {}))).rejects.toThrow(
                WorkFlowNodeError
            )
        })
    })
})
