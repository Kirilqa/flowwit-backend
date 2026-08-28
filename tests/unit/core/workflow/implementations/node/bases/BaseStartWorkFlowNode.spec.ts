import { z } from 'zod'
import { WorkFlowNodeError, WorkFlowNodeEvent, WorkFlowNodeResult } from '@workflow'
import { BaseStartWorkFlowNode } from '@workflow/implementations/node/bases/BaseStartWorkFlowNode'
import { runNode } from '../../../../../../helpers/runNode'

const inputSchema = z.string()
const outputsSchema = z.object({ result: z.string() })

class TestStartNode extends BaseStartWorkFlowNode<typeof inputSchema, typeof outputsSchema> {
    readonly type = 'test-start'
    readonly inputSchema = inputSchema
    readonly outputs = outputsSchema

    protected async *run(
        input: string
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof outputsSchema>>> {
        return { output: { result: input } }
    }
}

describe('BaseStartWorkFlowNode', () => {
    describe('portsJsonSchema', () => {
        it('returns an object with a $input key', () => {
            const node = new TestStartNode()
            const schema = node.portsJsonSchema
            expect(schema).toHaveProperty('$input')
        })

        it('is cached — returns same reference on repeated access', () => {
            const node = new TestStartNode()
            expect(node.portsJsonSchema).toBe(node.portsJsonSchema)
        })

        it('$input schema reflects the inputSchema', () => {
            const node = new TestStartNode()
            const schema = node.portsJsonSchema
            expect(schema['$input']).toBeDefined()
        })
    })

    describe('ports', () => {
        it('returns an object with $input mapped to inputSchema', () => {
            const node = new TestStartNode()
            const ports = node.ports
            expect(ports).toHaveProperty('$input')
        })
    })

    describe('resolvePortsThroughSchema', () => {
        it('returns original ports when input parse fails (wrong type)', () => {
            const node = new TestStartNode()
            const invalid: Record<string, unknown> = { $input: 42 }
            const result = node.resolvePortsThroughSchema(invalid)
            expect(result).toBe(invalid)
        })

        it('returns resolved ports when input parse succeeds', () => {
            const node = new TestStartNode()
            const valid: Record<string, unknown> = { $input: 'hello' }
            const result = node.resolvePortsThroughSchema(valid)
            expect(result).toEqual({ $input: 'hello' })
        })
    })

    describe('execute', () => {
        it('throws WorkFlowNodeError for invalid input type', async () => {
            const node = new TestStartNode()
            await expect(runNode(node.execute({ $input: 42 }, {}))).rejects.toThrow(WorkFlowNodeError)
        })

        it('error message contains the node type', async () => {
            const node = new TestStartNode()
            await expect(runNode(node.execute({ $input: 42 }, {}))).rejects.toThrow(/test-start/)
        })

        it('returns result for valid input', async () => {
            const node = new TestStartNode()
            const { result } = await runNode(node.execute({ $input: 'world' }, {}))
            expect(result.output['result']).toBe('world')
        })
    })
})
