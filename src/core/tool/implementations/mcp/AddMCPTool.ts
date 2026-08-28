import { z } from 'zod'
import { MCPClientFactory, MCPServerConfig, MCPServerConfigRepositoryInterface, MCPServerRegistryInterface } from '@mcp'
import { AgentToolError } from '../../errors'
import { BaseMCPTool } from './bases/BaseMCPTool'
import { MCPServerSummary } from './types'
import { addMCPToolSchema } from './validators'

export class AddMCPTool extends BaseMCPTool<typeof addMCPToolSchema> {
    readonly name = 'mcp_add'
    readonly description =
        'Adds a new MCP server configuration, saves it to disk and registers the client in the system. The connection is established asynchronously — the returned status usually reflects "connecting", not the final outcome. Use mcp_info to poll the actual status, and mcp_register to make it available for a specific agent.'
    readonly schema = addMCPToolSchema

    constructor(
        private readonly mcpServerConfigRepository: MCPServerConfigRepositoryInterface,
        private readonly mcpServerRegistry: MCPServerRegistryInterface,
        private readonly mcpClientFactory: MCPClientFactory
    ) {
        super()
    }

    protected async run(args: z.infer<typeof addMCPToolSchema>): Promise<MCPServerSummary> {
        const existing = await this.mcpServerConfigRepository.findById(args.name)

        if (existing !== null) {
            throw new AgentToolError(`MCP server "${args.name}" already exists. Use mcp_update to modify it.`)
        }

        const config = this.buildConfig(args)

        await this.mcpServerConfigRepository.create(config)

        const client = this.mcpClientFactory(config)
        this.mcpServerRegistry.register(args.name, client)

        return {
            name: args.name,
            config,
            status: client.getStatus()
        }
    }

    private buildConfig(args: z.infer<typeof addMCPToolSchema>): MCPServerConfig {
        if (args.server.type === 'stdio') {
            return {
                name: args.name,
                type: 'stdio',
                command: args.server.command,
                ...(args.server.args !== undefined && { args: args.server.args }),
                ...(args.server.env !== undefined && { env: args.server.env })
            }
        }

        return {
            name: args.name,
            type: args.server.type,
            url: args.server.url,
            ...(args.server.headers !== undefined && { headers: args.server.headers })
        }
    }
}
