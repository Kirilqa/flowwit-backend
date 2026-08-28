import { WorkFlowNodeError } from '@workflow'
import { TransformNode } from '@workflow/implementations/node/TransformNode'
import { runNode } from '../../../../../helpers/runNode'

describe('TransformNode', () => {
    let node: TransformNode

    beforeEach(() => {
        node = new TransformNode()
    })

    it('has type "transform" and is not a start node', () => {
        expect(node.type).toBe('transform')
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
        it('evaluates string transformation expression', async () => {
            const { result } = await runNode(
                node.execute({ value: 'hello' }, { expression: 'String($input).toUpperCase()' })
            )
            expect(result.output['result']).toBe('HELLO')
        })

        it('evaluates numeric expression', async () => {
            const { result } = await runNode(node.execute({ value: 21 }, { expression: '$input * 2' }))
            expect(result.output['result']).toBe(42)
        })

        it('passes value through with identity expression', async () => {
            const value = { a: 1 }
            const { result } = await runNode(node.execute({ value }, { expression: '$input' }))
            expect(result.output['result']).toBe(value)
        })

        it('emits no events', async () => {
            const { events } = await runNode(node.execute({ value: 'x' }, { expression: '$input' }))
            expect(events).toHaveLength(0)
        })

        it('throws WorkFlowNodeError when expression is missing from config', async () => {
            await expect(runNode(node.execute({ value: 'x' }, {}))).rejects.toThrow(WorkFlowNodeError)
        })

        it('throws WorkFlowNodeError on runtime error in expression', async () => {
            await expect(runNode(node.execute({ value: null }, { expression: '$input.foo.bar' }))).rejects.toThrow(
                WorkFlowNodeError
            )
        })

        it('throws WorkFlowNodeError on syntax error in expression', async () => {
            await expect(runNode(node.execute({ value: 1 }, { expression: '(((' }))).rejects.toThrow(WorkFlowNodeError)
        })
    })
})
