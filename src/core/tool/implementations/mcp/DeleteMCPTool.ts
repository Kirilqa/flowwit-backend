import { z } from 'zod'
import { MCPServerConfigRepositoryInterface, MCPServerRegistryInterface } from '@mcp'
import { AgentToolError } from '../../errors'
import { BaseMCPTool } from './bases/BaseMCPTool'
import { deleteMCPToolSchema } from './validators'

export class DeleteMCPTool extends BaseMCPTool<typeof deleteMCPToolSchema> {
    readonly name = 'mcp_delete'
    readonly description =
        'Removes an MCP server configuration from disk and disconnects it from the system. Any agents that have this server registered will lose access to its tools.'
    readonly schema = deleteMCPToolSchema

    constructor(
        private readonly mcpServerConfigRepository: MCPServerConfigRepositoryInterface,
        private readonly mcpServerRegistry: MCPServerRegistryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof deleteMCPToolSchema>): Promise<string> {
        const existing = await this.mcpServerConfigRepository.findById(args.name)

        if (existing === null) {
            throw new AgentToolError(`MCP server "${args.name}" not found.`)
        }

        await this.mcpServerConfigRepository.delete(args.name)
        this.mcpServerRegistry.unregister(args.name)

        return `MCP server "${args.name}" deleted successfully.`
    }
}
