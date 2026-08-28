import { z } from 'zod'
import { WorkFlowNodeEvent, WorkFlowNodeResult } from '@workflow'
import { BaseWorkFlowNode } from '@workflow/implementations/node/bases/BaseWorkFlowNode'

const portsSchema = z.object({ value: z.string() })
const outputsSchema = z.object({ result: z.string() })

class TestWorkFlowNode extends BaseWorkFlowNode<typeof portsSchema, typeof outputsSchema> {
    readonly type = 'test-wf-node'
    readonly ports = portsSchema
    readonly outputs = outputsSchema

    protected async *run(
        ports: z.infer<typeof portsSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof outputsSchema>>> {
        return { output: { result: ports.value } }
    }
}

describe('BaseWorkFlowNode', () => {
    describe('portsJsonSchema', () => {
        it('returns a JSON schema object', () => {
            const node = new TestWorkFlowNode()
            const schema = node.portsJsonSchema
            expect(schema).toBeDefined()
            expect(typeof schema).toBe('object')
        })

        it('is cached — returns same reference on repeated access', () => {
            const node = new TestWorkFlowNode()
            expect(node.portsJsonSchema).toBe(node.portsJsonSchema)
        })

        it('reflects the ports schema fields', () => {
            const node = new TestWorkFlowNode()
            const schema = node.portsJsonSchema
            expect(JSON.stringify(schema)).toContain('value')
        })
    })

    describe('resolvePortsThroughSchema', () => {
        it('returns original ports when parsing fails (wrong type)', () => {
            const node = new TestWorkFlowNode()
            const invalid: Record<string, unknown> = { value: 123 }
            const result = node.resolvePortsThroughSchema(invalid)
            expect(result).toBe(invalid)
        })

        it('returns parsed data when parsing succeeds', () => {
            const node = new TestWorkFlowNode()
            const valid: Record<string, unknown> = { value: 'hello' }
            const result = node.resolvePortsThroughSchema(valid)
            expect(result).toEqual({ value: 'hello' })
        })
    })
})
