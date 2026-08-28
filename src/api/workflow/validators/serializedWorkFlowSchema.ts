import { z } from 'zod'

const constantMappingValueSchema = z.object({
    type: z.literal('constant'),
    data: z.union([z.string(), z.number(), z.boolean()])
})

const expressionMappingValueSchema = z.object({
    type: z.literal('expression'),
    expression: z.string()
})

const mappingValueSchema = z.discriminatedUnion('type', [constantMappingValueSchema, expressionMappingValueSchema])

const inputMappingSchema = z.object({
    targetParameter: z.string(),
    value: mappingValueSchema
})

const serializedWorkFlowNodeEntrySchema = z.object({
    id: z.string(),
    nodeType: z.string(),
    portMappings: z.record(z.string(), z.array(inputMappingSchema)).optional().default({}),
    configOverrides: z.record(z.string(), mappingValueSchema).optional().default({})
})

const workFlowConnectionSchema = z.object({
    id: z.string().min(1),
    sourceNodeId: z.string(),
    sourcePort: z.string(),
    targetNodeId: z.string(),
    targetPort: z.string()
})

export const serializedWorkFlowSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    entries: z.array(serializedWorkFlowNodeEntrySchema),
    connections: z.array(workFlowConnectionSchema)
})

export type SerializedWorkFlowInput = z.infer<typeof serializedWorkFlowSchema>
