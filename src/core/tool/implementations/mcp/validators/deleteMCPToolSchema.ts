import { z } from 'zod'

export const deleteMCPToolSchema = z.object({
    name: z.string().min(1).describe('Name of the MCP server to delete')
})
