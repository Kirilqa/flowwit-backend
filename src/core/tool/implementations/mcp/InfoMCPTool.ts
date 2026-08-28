import { z } from 'zod'
import { MCP_SERVER_STATUS, MCPServerConfigRepositoryInterface, MCPServerRegistryInterface } from '@mcp'
import { AgentToolError } from '../../errors'
import { BaseMCPTool } from './bases/BaseMCPTool'
import { MCPServerSummary } from './types'
import { infoMCPToolSchema } from './validators'

export class InfoMCPTool extends BaseMCPTool<typeof infoMCPToolSchema> {
    readonly name = 'mcp_info'
    readonly description = 'Returns the configuration and current connection status of a specific MCP server.'
    readonly schema = infoMCPToolSchema

    constructor(
        private readonly mcpServerConfigRepository: MCPServerConfigRepositoryInterface,
        private readonly mcpServerRegistry: MCPServerRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof infoMCPToolSchema>): Promise<MCPServerSummary> {
        const config = await this.mcpServerConfigRepository.findById(args.name)

        if (config === null) {
            throw new AgentToolError(`MCP server "${args.name}" not found.`)
        }

        return {
            name: config.name,
            config,
            status: this.mcpServerRegistry.get(args.name)?.getStatus() ?? MCP_SERVER_STATUS.DISCONNECTED
        }
    }
}
