import { z } from 'zod'

export const infoMCPToolSchema = z.object({
    name: z.string().min(1).describe('Name of the MCP server to get info about')
})
