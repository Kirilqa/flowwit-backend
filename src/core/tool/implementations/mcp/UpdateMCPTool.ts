import { z } from 'zod'
import { MCPClientFactory, MCPServerConfig, MCPServerConfigRepositoryInterface, MCPServerRegistryInterface } from '@mcp'
import { AgentToolError } from '../../errors'
import { BaseMCPTool } from './bases/BaseMCPTool'
import { MCPServerSummary } from './types'
import { updateMCPToolSchema } from './validators'

export class UpdateMCPTool extends BaseMCPTool<typeof updateMCPToolSchema> {
    readonly name = 'mcp_update'
    readonly description =
        'Updates an existing MCP server configuration. Only provided fields will be changed. The client is reconnected automatically after the update, asynchronously — the returned status usually reflects "connecting", not the final outcome. Use mcp_info to poll the actual status.'
    readonly schema = updateMCPToolSchema

    constructor(
        private readonly mcpServerConfigRepository: MCPServerConfigRepositoryInterface,
        private readonly mcpServerRegistry: MCPServerRegistryInterface,
        private readonly mcpClientFactory: MCPClientFactory
    ) {
        super()
    }

    protected async run(args: z.infer<typeof updateMCPToolSchema>): Promise<MCPServerSummary> {
        const existing = await this.mcpServerConfigRepository.findById(args.name)

        if (existing === null) {
            throw new AgentToolError(`MCP server "${args.name}" not found. Use mcp_add to create it.`)
        }

        const patch = this.buildPatch(args)
        const updated = await this.mcpServerConfigRepository.update(args.name, patch)

        const client = this.mcpClientFactory(updated)
        this.mcpServerRegistry.register(args.name, client)

        return {
            name: args.name,
            config: updated,
            status: client.getStatus()
        }
    }

    private buildPatch(args: z.infer<typeof updateMCPToolSchema>): Partial<MCPServerConfig> {
        return {
            ...(args.command !== undefined && { command: args.command }),
            ...(args.args !== undefined && { args: args.args }),
            ...(args.env !== undefined && { env: args.env }),
            ...(args.url !== undefined && { url: args.url }),
            ...(args.headers !== undefined && { headers: args.headers })
        }
    }
}
