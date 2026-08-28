import { MCPCallToolResultContent } from './MCPCallToolResultContent'

export type MCPCallToolResult = {
    content: Array<MCPCallToolResultContent>
    isError: boolean
    structuredContent?: Record<string, unknown>
}
