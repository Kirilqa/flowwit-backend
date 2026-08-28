import { ListWorkFlowRunsTool } from '@tool/implementations/workflow/ListWorkFlowRunsTool'
import { WORKFLOW_RUN_STATUS } from '@workflow'
import { makeWorkFlowRun, makeWorkFlowRunRepository } from '../../../../../helpers/makeWorkFlow'

describe('ListWorkFlowRunsTool', () => {
    it('has correct name', () => {
        expect(new ListWorkFlowRunsTool(makeWorkFlowRunRepository()).name).toBe('workflow_list_runs')
    })

    it('returns empty array when no runs exist', async () => {
        const tool = new ListWorkFlowRunsTool(makeWorkFlowRunRepository())
        const result = await tool.execute({}, 'agent-1', 'session-1')
        expect(result).toEqual([])
    })

    it('returns all runs when no filters applied', async () => {
        const runs = [makeWorkFlowRun('wf-1'), makeWorkFlowRun('wf-2')]
        const tool = new ListWorkFlowRunsTool(makeWorkFlowRunRepository(runs))
        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<{ id: string }>
        expect(result).toHaveLength(2)
    })

    it('filters by workflowId', async () => {
        const runs = [makeWorkFlowRun('wf-1'), makeWorkFlowRun('wf-2'), makeWorkFlowRun('wf-1')]
        const tool = new ListWorkFlowRunsTool(makeWorkFlowRunRepository(runs))
        const result = (await tool.execute({ workflowId: 'wf-1' }, 'agent-1', 'session-1')) as Array<{
            workflowId: string
        }>
        expect(result).toHaveLength(2)
        expect(result.every(r => r.workflowId === 'wf-1')).toBe(true)
    })

    it('filters by status', async () => {
        const pending = makeWorkFlowRun('wf-1', WORKFLOW_RUN_STATUS.PENDING)
        const completed = makeWorkFlowRun('wf-1', WORKFLOW_RUN_STATUS.COMPLETED)
        const tool = new ListWorkFlowRunsTool(makeWorkFlowRunRepository([pending, completed]))
        const result = (await tool.execute(
            { status: WORKFLOW_RUN_STATUS.COMPLETED },
            'agent-1',
            'session-1'
        )) as Array<{ status: string }>
        expect(result).toHaveLength(1)
        expect(result[0]?.status).toBe(WORKFLOW_RUN_STATUS.COMPLETED)
    })

    it('filters by both workflowId and status', async () => {
        const r1 = makeWorkFlowRun('wf-1', WORKFLOW_RUN_STATUS.PENDING)
        const r2 = makeWorkFlowRun('wf-1', WORKFLOW_RUN_STATUS.COMPLETED)
        const r3 = makeWorkFlowRun('wf-2', WORKFLOW_RUN_STATUS.PENDING)
        const tool = new ListWorkFlowRunsTool(makeWorkFlowRunRepository([r1, r2, r3]))
        const result = (await tool.execute(
            { workflowId: 'wf-1', status: WORKFLOW_RUN_STATUS.PENDING },
            'agent-1',
            'session-1'
        )) as Array<{ id: string }>
        expect(result).toHaveLength(1)
        expect(result[0]?.id).toBe(r1.id)
    })

    it('includes id, workflowId, status, input, createdAt, updatedAt in each summary', async () => {
        const run = makeWorkFlowRun('wf-1')
        const tool = new ListWorkFlowRunsTool(makeWorkFlowRunRepository([run]))
        const result = (await tool.execute({}, 'agent-1', 'session-1')) as Array<{
            id: string
            workflowId: string
            status: string
            input: unknown
            createdAt: number
            updatedAt: number
        }>
        expect(result[0]).toMatchObject({
            id: run.id,
            workflowId: 'wf-1',
            status: WORKFLOW_RUN_STATUS.PENDING
        })
        expect(result[0]?.createdAt).toBeDefined()
        expect(result[0]?.updatedAt).toBeDefined()
    })
})
