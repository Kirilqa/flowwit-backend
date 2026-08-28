import { z } from 'zod'

const stdioFields = z.object({
    command: z.string().min(1).optional().describe('New command for the stdio server process'),
    args: z.array(z.string()).optional().describe('New arguments for the stdio server'),
    env: z.record(z.string(), z.string()).optional().describe('New environment variables for the stdio server')
})

const httpFields = z.object({
    url: z.url().optional().describe('New URL for the HTTP server'),
    headers: z.record(z.string(), z.string()).optional().describe('New HTTP headers for the server')
})

export const updateMCPToolSchema = z.object({
    name: z.string().min(1).describe('Name of the MCP server to update'),
    ...stdioFields.shape,
    ...httpFields.shape
})
