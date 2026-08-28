import { RawAgentConfigRepositoryInterface, AgentRegistryInterface, RawAgentFactory } from '@agent'
import { GuardrailRegistryInterface } from '@guardrail'
import { ThinkingStrategyRegistryInterface } from '@strategy'
import { ProviderRegistryInterface } from '@provider'
import { ToolRegistryInterface } from '../../../interfaces'
import { SkillRegistryInterface } from '@skill'
import { MCPServerRegistryInterface } from '@mcp'
import { WorkFlowRegistryInterface } from '@workflow'

export type CreateAgentToolsDependencies = {
    rawAgentFactory: RawAgentFactory
    agentRegistry: AgentRegistryInterface
    providerRegistry: ProviderRegistryInterface
    thinkingStrategyRegistry: ThinkingStrategyRegistryInterface
    toolRegistry: ToolRegistryInterface
    skillRegistry: SkillRegistryInterface
    mcpServerRegistry: MCPServerRegistryInterface
    workflowRegistry: WorkFlowRegistryInterface
    guardrailRegistry: GuardrailRegistryInterface
    rawAgentConfigRepository?: RawAgentConfigRepositoryInterface
}
