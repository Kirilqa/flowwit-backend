import { z } from 'zod'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface } from '@agent'
import { AgentToolError } from '../../errors'
import { BaseMCPTool } from './bases/BaseMCPTool'
import { unregisterMCPToolSchema } from './validators'

export class UnregisterMCPTool extends BaseMCPTool<typeof unregisterMCPToolSchema> {
    readonly name = 'mcp_unregister'
    readonly description =
        'Unregisters an MCP server from yourself, making its tools unavailable for execution. The server remains in the system and can be re-registered later.'
    readonly schema = unregisterMCPToolSchema

    constructor(
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly agentConfigRepository: RawAgentConfigRepositoryInterface | null
    ) {
        super()
    }

    protected async run(args: z.infer<typeof unregisterMCPToolSchema>, agentId: string): Promise<string> {
        const agent = this.agentRegistry.get(agentId)

        if (agent === null) {
            throw new AgentToolError(`Agent "${agentId}" not found.`)
        }

        const isRegistered = agent.config.mcpServers?.some(s => s.alias === args.serverName) ?? false

        if (!isRegistered) {
            throw new AgentToolError(`MCP server "${args.serverName}" is not registered for this agent.`)
        }

        const updatedServers = (agent.config.mcpServers ?? []).filter(s => s.alias !== args.serverName)

        agent.update({ mcpServers: updatedServers })

        if (this.agentConfigRepository !== null) {
            await this.agentConfigRepository.update(agentId, { mcpServers: updatedServers.map(s => s.alias) })
        }

        return `MCP server "${args.serverName}" unregistered successfully.`
    }
}
