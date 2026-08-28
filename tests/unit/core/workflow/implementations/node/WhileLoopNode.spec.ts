import { WorkFlowNodeError } from '@workflow'
import { WhileLoopNode } from '@workflow/implementations/node/WhileLoopNode'
import { runNode } from '../../../../../helpers/runNode'

describe('WhileLoopNode', () => {
    let node: WhileLoopNode

    beforeEach(() => {
        node = new WhileLoopNode()
    })

    it('has type "while_loop" and is not a start node', () => {
        expect(node.type).toBe('while_loop')
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
        it('emits loop output and executionId when condition is true', async () => {
            const { result } = await runNode(node.execute({ value: 'data' }, { condition: true }))
            expect(result.output['loop']).toBe('data')
            expect(result.executionIds?.['loop']).toBe(true)
        })

        it('routes to done output when condition is false', async () => {
            const { result } = await runNode(node.execute({ value: 'data' }, { condition: false }))
            expect(result.output['done']).toBe('data')
            expect(result.executionIds).toBeUndefined()
        })

        it('prefers loop port over value port', async () => {
            const { result } = await runNode(node.execute({ value: 'ignored', loop: 'used' }, { condition: true }))
            expect(result.output['loop']).toBe('used')
        })

        it('emits no events', async () => {
            const { events } = await runNode(node.execute({ value: 'x' }, { condition: false }))
            expect(events).toHaveLength(0)
        })

        it('throws WorkFlowNodeError when condition is missing from config', async () => {
            await expect(runNode(node.execute({ value: 'x' }, {}))).rejects.toThrow(WorkFlowNodeError)
        })
    })
})
