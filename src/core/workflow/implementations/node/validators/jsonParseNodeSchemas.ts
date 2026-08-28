import { z } from 'zod'

export const jsonParseNodePortsSchema = z.object({
    value: z.string()
})

export const jsonParseNodeOutputsSchema = z.object({
    result: z.unknown()
})
