import { z } from 'zod'

export const registerMCPToolSchema = z.object({
    serverName: z
        .string()
        .min(1)
        .describe('Name of the MCP server to register. The server must already be present in the system.')
})
