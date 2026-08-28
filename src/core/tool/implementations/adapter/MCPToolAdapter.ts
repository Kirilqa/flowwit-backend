import { ToolInterface } from '../../interfaces'
import { MCPClientInterface, MCPToolDefinition } from '@mcp'
import { AgentToolError } from '../../errors'

export class MCPToolAdapter implements ToolInterface {
    readonly name: string
    readonly description: string
    readonly parameters: Record<string, unknown>

    constructor(
        name: string,
        private readonly client: MCPClientInterface,
        private readonly definition: MCPToolDefinition
    ) {
        this.name = name
        this.description = definition.description ?? ''
        this.parameters = definition.inputSchema
    }

    async execute(args: Record<string, unknown>): Promise<unknown> {
        const originalName = this.definition.name
        const result = await this.client.callTool(originalName, args)

        if (result.isError) {
            throw new AgentToolError(
                `MCP tool "${this.name}" returned an error: ${this.extractContent(result.content)}`
            )
        }

        return result.structuredContent ?? this.extractContent(result.content)
    }

    private extractContent(content: Array<{ type: string; text?: string }>): string {
        return content
            .filter(c => c.type === 'text' && c.text)
            .map(c => c.text)
            .join('\n')
    }
}
