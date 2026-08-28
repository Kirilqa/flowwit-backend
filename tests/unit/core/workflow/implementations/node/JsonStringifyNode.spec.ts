import { WorkFlowNodeError } from '@workflow'
import { JsonStringifyNode } from '@workflow/implementations/node/JsonStringifyNode'
import { runNode } from '../../../../../helpers/runNode'

describe('JsonStringifyNode', () => {
    let node: JsonStringifyNode

    beforeEach(() => {
        node = new JsonStringifyNode()
    })

    it('has type "json_stringify" and is not a start node', () => {
        expect(node.type).toBe('json_stringify')
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
        it('stringifies an object with no indentation by default', async () => {
            const { result } = await runNode(node.execute({ value: { a: 1, b: 'x' } }, {}))
            expect(result.output['result']).toBe('{"a":1,"b":"x"}')
        })

        it('stringifies with specified indentation', async () => {
            const { result } = await runNode(node.execute({ value: { a: 1 } }, { indent: 2 }))
            expect(result.output['result']).toBe('{\n  "a": 1\n}')
        })

        it('stringifies an array', async () => {
            const { result } = await runNode(node.execute({ value: [1, 2, 3] }, {}))
            expect(result.output['result']).toBe('[1,2,3]')
        })

        it('stringifies a primitive number', async () => {
            const { result } = await runNode(node.execute({ value: 42 }, {}))
            expect(result.output['result']).toBe('42')
        })

        it('stringifies null', async () => {
            const { result } = await runNode(node.execute({ value: null }, {}))
            expect(result.output['result']).toBe('null')
        })

        it('emits no events', async () => {
            const { events } = await runNode(node.execute({ value: {} }, {}))
            expect(events).toHaveLength(0)
        })

        it('throws WorkFlowNodeError when indent is out of range', async () => {
            await expect(runNode(node.execute({ value: {} }, { indent: 9 }))).rejects.toThrow(WorkFlowNodeError)
        })

        it('throws WorkFlowNodeError for circular references', async () => {
            const circular: Record<string, unknown> = {}
            circular['self'] = circular
            await expect(runNode(node.execute({ value: circular }, {}))).rejects.toThrow(WorkFlowNodeError)
        })
    })
})
