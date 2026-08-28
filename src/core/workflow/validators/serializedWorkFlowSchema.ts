import { z } from 'zod'
import { stripUndefined } from '@core/utils'
import { SerializedWorkFlow } from '../types/SerializedWorkFlow'
import { SerializedWorkFlowNodeEntry } from '../types/SerializedWorkFlowNodeEntry'
import { persistedMappingValueSchema } from './mappingValueSchema'
import { workFlowConnectionSchema } from './workFlowConnectionSchema'

const inputMappingSchema = z.object({
    targetParameter: z.string(),
    value: persistedMappingValueSchema
})

const serializedWorkFlowNodeEntrySchema: z.ZodType<SerializedWorkFlowNodeEntry> = z.object({
    id: z.string().min(1),
    nodeType: z.string().min(1),
    portMappings: z.record(z.string(), z.array(inputMappingSchema)),
    configOverrides: z.record(z.string(), persistedMappingValueSchema)
})

export const serializedWorkFlowSchema: z.ZodType<SerializedWorkFlow> = z
    .object({
        id: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        entries: z.array(serializedWorkFlowNodeEntrySchema),
        connections: z.array(workFlowConnectionSchema)
    })
    .transform(raw => stripUndefined(raw) as SerializedWorkFlow)
