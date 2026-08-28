import { z } from 'zod'

export const mergeNodePortsSchema = z.object({
    a: z.unknown(),
    b: z.unknown()
})

export const mergeNodeOutputsSchema = z.object({
    result: z.object({
        a: z.unknown(),
        b: z.unknown()
    })
})
