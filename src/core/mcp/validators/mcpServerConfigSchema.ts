import { mcpHttpServerConfigSchema } from './mcpHttpServerConfigSchema'
import { mcpStdioServerConfigSchema } from './mcpStdioServerConfigSchema'
import { z } from 'zod'

const rawMcpServerConfigSchema = z.union([mcpStdioServerConfigSchema, mcpHttpServerConfigSchema])

export const mcpServerConfigSchema = z.preprocess(raw => {
    if (typeof raw !== 'object' || raw === null || 'type' in raw) return raw

    if ('url' in raw) return { type: 'streamable-http', ...raw }
    if ('command' in raw) return { type: 'stdio', ...raw }

    return raw
}, rawMcpServerConfigSchema)
