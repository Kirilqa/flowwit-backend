import { WorkFlowNodeError } from '@workflow'
import { JsonParseNode } from '@workflow/implementations/node/JsonParseNode'
import { runNode } from '../../../../../helpers/runNode'

describe('JsonParseNode', () => {
    let node: JsonParseNode

    beforeEach(() => {
        node = new JsonParseNode()
    })

    it('has type "json_parse" and is not a start node', () => {
        expect(node.type).toBe('json_parse')
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
        it('parses a JSON object string', async () => {
            const { result } = await runNode(node.execute({ value: '{"key":"val","num":42}' }, {}))
            expect(result.output['result']).toEqual({ key: 'val', num: 42 })
        })

        it('parses a JSON array string', async () => {
            const { result } = await runNode(node.execute({ value: '[1,2,3]' }, {}))
            expect(result.output['result']).toEqual([1, 2, 3])
        })

        it('parses a JSON primitive string', async () => {
            const { result } = await runNode(node.execute({ value: '"hello"' }, {}))
            expect(result.output['result']).toBe('hello')
        })

        it('parses a JSON number string', async () => {
            const { result } = await runNode(node.execute({ value: '123' }, {}))
            expect(result.output['result']).toBe(123)
        })

        it('parses a JSON null', async () => {
            const { result } = await runNode(node.execute({ value: 'null' }, {}))
            expect(result.output['result']).toBeNull()
        })

        it('emits no events', async () => {
            const { events } = await runNode(node.execute({ value: '{}' }, {}))
            expect(events).toHaveLength(0)
        })

        it('throws WorkFlowNodeError for invalid JSON string', async () => {
            await expect(runNode(node.execute({ value: '{invalid}' }, {}))).rejects.toThrow(WorkFlowNodeError)
        })

        it('throws WorkFlowNodeError when value is not a string', async () => {
            await expect(runNode(node.execute({ value: 123 }, {}))).rejects.toThrow(WorkFlowNodeError)
        })
    })
})
