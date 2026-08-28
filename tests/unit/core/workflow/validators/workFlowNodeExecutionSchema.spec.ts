import { WORKFLOW_NODE_STATE_STATUS } from '@workflow'
import { workFlowNodeExecutionSchema } from '@workflow/validators/workFlowNodeExecutionSchema'

describe('workFlowNodeExecutionSchema', () => {
    it('accepts a minimal execution with only the required fields', () => {
        const result = workFlowNodeExecutionSchema.safeParse({
            executionId: 'exec-1',
            status: WORKFLOW_NODE_STATE_STATUS.PENDING,
            receivedPorts: {}
        })
        expect(result.success).toBe(true)
    })

    it('parses a fully populated execution, preserving all optional fields', () => {
        const result = workFlowNodeExecutionSchema.safeParse({
            executionId: 'exec-1',
            status: WORKFLOW_NODE_STATE_STATUS.COMPLETED,
            receivedPorts: { value: 'hello' },
            resolvedPorts: { value: 'hello' },
            resolvedConfig: { expression: '$input' },
            output: { result: 'hello' },
            state: { count: 1 },
            error: undefined,
            startedAt: 100,
            completedAt: 200
        })
        expect(result.success).toBe(true)
        if (!result.success) throw new Error()
        expect(result.data).toMatchObject({
            resolvedPorts: { value: 'hello' },
            resolvedConfig: { expression: '$input' },
            output: { result: 'hello' },
            state: { count: 1 },
            startedAt: 100,
            completedAt: 200
        })
    })

    it('strips undefined optional fields from the parsed result', () => {
        const result = workFlowNodeExecutionSchema.safeParse({
            executionId: 'exec-1',
            status: WORKFLOW_NODE_STATE_STATUS.FAILED,
            receivedPorts: {},
            error: 'boom'
        })
        expect(result.success).toBe(true)
        if (!result.success) throw new Error()
        expect(result.data.error).toBe('boom')
        expect('resolvedPorts' in result.data).toBe(false)
        expect('output' in result.data).toBe(false)
    })

    it('rejects an execution with an invalid status', () => {
        const result = workFlowNodeExecutionSchema.safeParse({
            executionId: 'exec-1',
            status: 'not-a-real-status',
            receivedPorts: {}
        })
        expect(result.success).toBe(false)
    })

    it('rejects an execution missing required fields', () => {
        const result = workFlowNodeExecutionSchema.safeParse({ status: WORKFLOW_NODE_STATE_STATUS.PENDING })
        expect(result.success).toBe(false)
    })
})
