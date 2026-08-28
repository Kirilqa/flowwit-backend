import { mcpServerConfigSchema } from './mcpServerConfigSchema'
import { z } from 'zod'

export const mcpServerConfigStoreSchema = z.record(z.string().min(1), mcpServerConfigSchema)
