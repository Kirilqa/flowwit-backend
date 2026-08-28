import { z } from 'zod'

export const skillNodePortsSchema = z.object({
    trigger: z.unknown()
})

export const skillNodeOutputsSchema = z.object({
    result: z.string()
})

export const skillNodeConfigSchema = z.object({
    skillName: z.string()
})
