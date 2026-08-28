import { z } from 'zod'

export const unregisterMCPToolSchema = z.object({
    serverName: z.string().min(1).describe('Name of the MCP server to unregister.')
})
