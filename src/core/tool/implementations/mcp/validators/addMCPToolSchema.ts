import { z } from 'zod'

export const addMCPToolSchema = z.object({
    name: z.string().min(1).describe('Unique name for this MCP server'),
    server: z
        .discriminatedUnion('type', [
            z.object({
                type: z.literal('stdio'),
                command: z.string().min(1).describe('Command to run the MCP server process'),
                args: z.array(z.string()).optional().describe('Arguments to pass to the command'),
                env: z.record(z.string(), z.string()).optional().describe('Environment variables for the process')
            }),
            z.object({
                type: z.enum(['streamable-http', 'sse']),
                url: z.url().describe('URL of the MCP server'),
                headers: z.record(z.string(), z.string()).optional().describe('HTTP headers to send with each request')
            })
        ])
        .describe(
            'Server connection config. Use "stdio" for local process-based servers, "streamable-http" or "sse" for remote servers.'
        )
})
