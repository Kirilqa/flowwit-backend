import { z } from 'zod'
import { stripUndefined } from '@core/utils'
import { SerializedWorkFlowRun } from '../types/SerializedWorkFlowRun'
import { SerializedWorkFlowRunNodeEntry } from '../types/SerializedWorkFlowRunNodeEntry'
import { WORKFLOW_RUN_STATUS } from '../types/WorkFlowRunStatus'
import { persistedMappingValueSchema } from './mappingValueSchema'
import { workFlowConnectionSchema } from './workFlowConnectionSchema'
import { workFlowNodeExecutionSchema } from './workFlowNodeExecutionSchema'

const inputMappingSchema = z.object({
    targetParameter: z.string(),
    value: persistedMappingValueSchema
})

const serializedWorkFlowRunNodeEntrySchema: z.ZodType<SerializedWorkFlowRunNodeEntry> = z.object({
    id: z.string().min(1),
    nodeType: z.string().min(1),
    portMappings: z.record(z.string(), z.array(inputMappingSchema)),
    configOverrides: z.record(z.string(), persistedMappingValueSchema),
    executions: z.record(z.string(), workFlowNodeExecutionSchema)
})

export const serializedWorkFlowRunSchema: z.ZodType<SerializedWorkFlowRun> = z
    .object({
        id: z.string().min(1),
        workflowId: z.string().min(1),
        status: z.enum(WORKFLOW_RUN_STATUS),
        input: z.unknown(),
        entries: z.array(serializedWorkFlowRunNodeEntrySchema),
        connections: z.array(workFlowConnectionSchema),
        createdAt: z.number(),
        updatedAt: z.number()
    })
    .transform(raw => stripUndefined(raw))
