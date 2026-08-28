import { z } from 'zod'

export const skillNameParamsSchema = z.object({ name: z.string() })
