import { z } from 'zod'
import { MCP_SERVER_STATUS, MCPCallToolResultContent, MCPServerRegistryInterface } from '@mcp'
import { getErrorMessage } from '@core/utils'
import { WorkFlowNodeError } from '../../errors/WorkFlowNodeError'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import { mcpToolNodePortsSchema, mcpToolNodeOutputsSchema, mcpToolNodeConfigSchema } from './validators'

export class MCPToolNode extends BaseWorkFlowNode<
    typeof mcpToolNodePortsSchema,
    typeof mcpToolNodeOutputsSchema,
    typeof mcpToolNodeConfigSchema
> {
    readonly type = 'mcp_tool' as const
    readonly ports = mcpToolNodePortsSchema
    readonly outputs = mcpToolNodeOutputsSchema
    override readonly configSchema = mcpToolNodeConfigSchema

    constructor(private readonly mcpServerRegistry: MCPServerRegistryInterface) {
        super()
    }

    protected async *run(
        ports: z.infer<typeof mcpToolNodePortsSchema>,
        config: z.infer<typeof mcpToolNodeConfigSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof mcpToolNodeOutputsSchema>>> {
        const client = this.mcpServerRegistry.get(config.serverAlias)

        if (client === null) {
            throw new WorkFlowNodeError(`MCP server "${config.serverAlias}" not found in registry`)
        }

        if (client.getStatus() !== MCP_SERVER_STATUS.CONNECTED) {
            throw new WorkFlowNodeError(`MCP server "${config.serverAlias}" is not connected`)
        }

        let result: unknown

        try {
            const response = await client.callTool(config.toolName, ports.args)

            if (response.isError) {
                throw new WorkFlowNodeError(
                    `MCP tool "${config.toolName}" on server "${config.serverAlias}" returned an error: ${this.extractText(response.content)}`
                )
            }

            result = response.structuredContent ?? this.extractText(response.content)
        } catch (error) {
            if (error instanceof WorkFlowNodeError) {
                throw error
            }

            throw new WorkFlowNodeError(
                `Failed to call MCP tool "${config.toolName}" on server "${config.serverAlias}": ${getErrorMessage(error)}`
            )
        }

        return { output: { result } }
    }

    private extractText(content: Array<MCPCallToolResultContent>): string {
        return content
            .filter((item): item is Extract<MCPCallToolResultContent, { type: 'text' }> => item.type === 'text')
            .map(item => item.text)
            .join('\n')
    }
}
