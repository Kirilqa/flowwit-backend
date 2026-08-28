import { z } from 'zod'

export const raceNodePortsSchema = z.object({
    a: z.unknown().optional(),
    b: z.unknown().optional()
})

export const raceNodeOutputsSchema = z.object({
    result: z.unknown()
})
