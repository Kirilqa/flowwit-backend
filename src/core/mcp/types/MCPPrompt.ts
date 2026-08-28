import { MCPPromptArgument } from './MCPPromptArgument'

export type MCPPrompt = {
    name: string
    description?: string
    arguments?: Array<MCPPromptArgument>
}
