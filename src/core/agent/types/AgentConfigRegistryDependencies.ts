import { ProviderRegistryInterface } from '@provider'
import { AgentRegistryInterface } from '../interfaces'
import { MCPServerRegistryInterface } from '@mcp'
import { SkillRegistryInterface } from '@skill'
import { ThinkingStrategyRegistryInterface } from '@strategy'
import { ToolRegistryInterface } from '@tool'
import { WorkFlowRegistryInterface } from '@workflow'

export type AgentConfigRegistryDependencies = {
    providerRegistry: ProviderRegistryInterface
    thinkingStrategyRegistry: ThinkingStrategyRegistryInterface
    toolRegistry: ToolRegistryInterface
    skillRegistry: SkillRegistryInterface
    agentRegistry: AgentRegistryInterface
    mcpServerRegistry: MCPServerRegistryInterface
    workflowRegistry: WorkFlowRegistryInterface
}
