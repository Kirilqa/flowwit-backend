import { z } from 'zod'
import { WORKFLOW_RUN_STATUS } from '@workflow'

export const listWorkFlowRunsToolSchema = z.object({
    workflowId: z.string().min(1).optional().describe('Filter runs by workflow ID'),
    status: z.enum(WORKFLOW_RUN_STATUS).optional().describe('Filter runs by status')
})
