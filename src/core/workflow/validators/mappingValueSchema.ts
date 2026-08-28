import { z } from 'zod'

const constantMappingValueSchema = z.object({
    type: z.literal('constant'),
    data: z.union([z.string(), z.number(), z.boolean()])
})

const expressionMappingValueSchema = z.object({
    type: z.literal('expression'),
    expression: z.string()
})

export const persistedMappingValueSchema = z.discriminatedUnion('type', [
    constantMappingValueSchema,
    expressionMappingValueSchema
])
