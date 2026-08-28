import { MCPClientFactory, MCPServerConfigRepositoryInterface, MCPServerRegistryInterface } from '@mcp'
import { AgentRegistryInterface, RawAgentConfigRepositoryInterface } from '@agent'
import { ToolInterface } from '../../../interfaces'
import { AddMCPTool } from '../AddMCPTool'
import { UpdateMCPTool } from '../UpdateMCPTool'
import { DeleteMCPTool } from '../DeleteMCPTool'
import { ListMCPTool } from '../ListMCPTool'
import { InfoMCPTool } from '../InfoMCPTool'
import { RegisterMCPTool } from '../RegisterMCPTool'
import { UnregisterMCPTool } from '../UnregisterMCPTool'

export const createMCPTools = (
    mcpClientFactory: MCPClientFactory,
    mcpServerConfigRepository: MCPServerConfigRepositoryInterface,
    mcpServerRegistry: MCPServerRegistryInterface,
    agentRegistry: AgentRegistryInterface,
    agentConfigRepository?: RawAgentConfigRepositoryInterface
): Array<ToolInterface> => {
    return [
        new AddMCPTool(mcpServerConfigRepository, mcpServerRegistry, mcpClientFactory),
        new UpdateMCPTool(mcpServerConfigRepository, mcpServerRegistry, mcpClientFactory),
        new DeleteMCPTool(mcpServerConfigRepository, mcpServerRegistry),
        new ListMCPTool(mcpServerConfigRepository, mcpServerRegistry),
        new InfoMCPTool(mcpServerConfigRepository, mcpServerRegistry),
        new RegisterMCPTool(mcpServerRegistry, agentRegistry, agentConfigRepository ?? null),
        new UnregisterMCPTool(agentRegistry, agentConfigRepository ?? null)
    ]
}
