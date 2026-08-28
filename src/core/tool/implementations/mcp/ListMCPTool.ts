import { z } from 'zod'
import { MCP_SERVER_STATUS, MCPServerConfigRepositoryInterface, MCPServerRegistryInterface } from '@mcp'
import { BaseMCPTool } from './bases/BaseMCPTool'
import { MCPServerSummary } from './types'
import { listMCPToolSchema } from './validators'

export class ListMCPTool extends BaseMCPTool<typeof listMCPToolSchema> {
    readonly name = 'mcp_list'
    readonly description =
        'Returns a list of all MCP servers available in the system with their configurations and current connection status. Use mcp_register to connect a server to a specific agent.'
    readonly schema = listMCPToolSchema

    constructor(
        private readonly mcpServerConfigRepository: MCPServerConfigRepositoryInterface,
        private readonly mcpServerRegistry: MCPServerRegistryInterface
    ) {
        super()
    }

    protected async run(_args: z.infer<typeof listMCPToolSchema>): Promise<Array<MCPServerSummary>> {
        const configs = await this.mcpServerConfigRepository.findAll()

        return configs.map(config => ({
            name: config.name,
            config,
            status: this.mcpServerRegistry.get(config.name)?.getStatus() ?? MCP_SERVER_STATUS.DISCONNECTED
        }))
    }
}
