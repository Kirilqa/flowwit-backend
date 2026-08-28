import { WorkFlowNodeError } from '@workflow'
import { ConditionNode } from '@workflow/implementations/node/ConditionNode'
import { runNode } from '../../../../../helpers/runNode'

describe('ConditionNode', () => {
    let node: ConditionNode

    beforeEach(() => {
        node = new ConditionNode()
    })

    it('has type "condition" and is not a start node', () => {
        expect(node.type).toBe('condition')
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
        it('routes to true output when condition is true', async () => {
            const { result } = await runNode(node.execute({ value: 'data' }, { condition: true }))
            expect(result.output['true']).toBe('data')
            expect(result.output['false']).toBeUndefined()
        })

        it('routes to false output when condition is false', async () => {
            const { result } = await runNode(node.execute({ value: 'data' }, { condition: false }))
            expect(result.output['false']).toBe('data')
            expect(result.output['true']).toBeUndefined()
        })

        it('passes complex value through to the matching port', async () => {
            const value = { nested: { key: 42 } }
            const { result } = await runNode(node.execute({ value }, { condition: true }))
            expect(result.output['true']).toBe(value)
        })

        it('emits no events', async () => {
            const { events } = await runNode(node.execute({ value: 'x' }, { condition: true }))
            expect(events).toHaveLength(0)
        })

        it('throws WorkFlowNodeError when condition is missing from config', async () => {
            await expect(runNode(node.execute({ value: 'x' }, {}))).rejects.toThrow(WorkFlowNodeError)
        })

        it('throws WorkFlowNodeError when condition is not a boolean', async () => {
            await expect(runNode(node.execute({ value: 'x' }, { condition: 'true' }))).rejects.toThrow(
                WorkFlowNodeError
            )
        })
    })
})
