import { z } from 'zod'
import { MCPServerRegistryInterface } from '@mcp'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface } from '@agent'
import { AgentToolError } from '../../errors'
import { BaseMCPTool } from './bases/BaseMCPTool'
import { MCPServerSummary } from './types'
import { registerMCPToolSchema } from './validators'

export class RegisterMCPTool extends BaseMCPTool<typeof registerMCPToolSchema> {
    readonly name = 'mcp_register'
    readonly description =
        'Registers an MCP server for yourself. Its tools become available for execution once the server actually reaches the "connected" status — use mcp_add first if the server does not exist yet, and mcp_info to check its current status.'
    readonly schema = registerMCPToolSchema

    constructor(
        private readonly mcpServerRegistry: MCPServerRegistryInterface,
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly agentConfigRepository: RawAgentConfigRepositoryInterface | null
    ) {
        super()
    }

    protected async run(args: z.infer<typeof registerMCPToolSchema>, agentId: string): Promise<MCPServerSummary> {
        const agent = this.agentRegistry.get(agentId)

        if (agent === null) {
            throw new AgentToolError(`Agent "${agentId}" not found.`)
        }

        const client = this.mcpServerRegistry.get(args.serverName)

        if (client === null) {
            throw new AgentToolError(
                `MCP server "${args.serverName}" does not exist in the system. Add it first using mcp_add.`
            )
        }

        const alreadyRegistered = agent.config.mcpServers?.some(s => s.alias === args.serverName) ?? false

        if (alreadyRegistered) {
            throw new AgentToolError(`MCP server "${args.serverName}" is already registered for this agent.`)
        }

        const updatedServers = [...(agent.config.mcpServers ?? []), client]

        agent.update({ mcpServers: updatedServers })

        if (this.agentConfigRepository !== null) {
            await this.agentConfigRepository.update(agentId, { mcpServers: updatedServers.map(s => s.alias) })
        }

        const config = client.getConfig()

        return {
            name: args.serverName,
            config,
            status: client.getStatus()
        }
    }
}
