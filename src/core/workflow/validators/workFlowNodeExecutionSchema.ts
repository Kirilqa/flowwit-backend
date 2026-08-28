import { z } from 'zod'
import { stripUndefined } from '@core/utils'
import { WorkFlowNodeExecution } from '../types/WorkFlowNodeExecution'
import { WORKFLOW_NODE_STATE_STATUS } from '../types/WorkFlowNodeStateStatus'

export const workFlowNodeExecutionSchema: z.ZodType<WorkFlowNodeExecution> = z
    .object({
        executionId: z.string(),
        status: z.enum(WORKFLOW_NODE_STATE_STATUS),
        receivedPorts: z.record(z.string(), z.unknown()),
        resolvedPorts: z.record(z.string(), z.unknown()).optional(),
        resolvedConfig: z.record(z.string(), z.unknown()).optional(),
        output: z.record(z.string(), z.unknown()).optional(),
        state: z.record(z.string(), z.unknown()).optional(),
        error: z.string().optional(),
        startedAt: z.number().optional(),
        completedAt: z.number().optional()
    })
    .transform(raw => stripUndefined(raw) as WorkFlowNodeExecution)
