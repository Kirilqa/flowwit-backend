import { z } from 'zod'

const constantMappingValueSchema = z.object({
    type: z.literal('constant'),
    data: z.union([z.string(), z.number(), z.boolean()]).describe('The constant value')
})

const expressionMappingValueSchema = z.object({
    type: z.literal('expression'),
    expression: z.string().describe('JS expression; $input is the port value, $ports has all ports as an object')
})

export const mappingValueSchema = z.discriminatedUnion('type', [
    constantMappingValueSchema,
    expressionMappingValueSchema
])

const inputMappingSchema = z.object({
    targetParameter: z.string().describe('Name of the target parameter in the node config'),
    value: mappingValueSchema
})

export const workFlowEntrySchema = z.object({
    id: z.string().min(1).describe('Unique identifier for this node instance within the workflow'),
    nodeType: z
        .string()
        .min(1)
        .describe('Node type identifier (e.g. "input", "llm", "agent"). Use workflow_nodes to list available types'),
    portMappings: z
        .record(z.string(), z.array(inputMappingSchema))
        .optional()
        .default({})
        .describe('Transformations applied to incoming port data. Omit for direct passthrough'),
    configOverrides: z
        .record(z.string(), mappingValueSchema)
        .optional()
        .default({})
        .describe('Configuration values for this node. Keys must match the node configSchema fields')
})

export const workFlowConnectionSchema = z.object({
    id: z.string().min(1).optional().describe('Connection ID; auto-generated if omitted'),
    sourceNodeId: z.string().min(1).describe('ID of the source node'),
    sourcePort: z.string().min(1).describe('Output port name on the source node'),
    targetNodeId: z.string().min(1).describe('ID of the target node'),
    targetPort: z.string().min(1).describe('Input port name on the target node')
})
