import { ChannelRegistryInterface, ChannelConfigRepositoryInterface } from '@channel'
import { CommandRegistryInterface } from '@command'
import { GuardrailRegistryInterface, GuardrailResolverInterface, GuardrailRulesStoreInterface } from '@guardrail'
import { AgentRegistryInterface, RawAgentFactory } from '../../core/agent'
import { RawAgentConfigRepositoryInterface } from '../../core/agent/interfaces'
import { MCPClientFactory, MCPServerConfigRepositoryInterface, MCPServerRegistryInterface } from '@mcp'
import { MemoryRepositoryInterface } from '@memory'
import { SessionManagerInterface } from '@session'
import { SkillRegistryInterface, SkillRepositoryInterface, SkillSafetyInspectorInterface } from '@skill'
import { ThinkingStrategyRegistryInterface } from '@strategy'
import { HumanInputResolverInterface, ToolRegistryInterface } from '@tool'
import { ProviderRegistryInterface } from '@provider'
import {
    WorkFlowRegistryInterface,
    WorkFlowNodeRegistryInterface,
    WorkFlowRepositoryInterface,
    WorkFlowRunRepositoryInterface,
    WorkFlowRunnerInterface
} from '@workflow'
import {
    SchedulerInterface,
    ScheduledTaskRegistryInterface,
    ScheduledTaskRepositoryInterface,
    ScheduledTaskRunRepositoryInterface
} from '@scheduler'

export type BackendServerOptions = {
    providerRegistry: ProviderRegistryInterface
    strategyRegistry: ThinkingStrategyRegistryInterface
    toolRegistry: ToolRegistryInterface
    agentRegistry: AgentRegistryInterface
    rawAgentConfigRepository: RawAgentConfigRepositoryInterface
    rawAgentFactory: RawAgentFactory
    mcpServerRegistry: MCPServerRegistryInterface
    mcpConfigRepository: MCPServerConfigRepositoryInterface
    mcpClientFactory: MCPClientFactory
    memoryRepository: MemoryRepositoryInterface
    skillRegistry: SkillRegistryInterface
    skillRepository: SkillRepositoryInterface
    skillSafetyInspector: SkillSafetyInspectorInterface
    commandRegistry: CommandRegistryInterface
    sessionManager: SessionManagerInterface
    humanInputResolver: HumanInputResolverInterface
    channelRegistry: ChannelRegistryInterface
    channelConfigRepository: ChannelConfigRepositoryInterface
    guardrailRegistry: GuardrailRegistryInterface
    guardrailResolver?: GuardrailResolverInterface
    guardrailRulesStore: GuardrailRulesStoreInterface
    workflowRegistry: WorkFlowRegistryInterface
    workflowNodeRegistry: WorkFlowNodeRegistryInterface
    workflowRepository: WorkFlowRepositoryInterface
    workflowRunRepository: WorkFlowRunRepositoryInterface
    workflowRunner: WorkFlowRunnerInterface
    scheduler: SchedulerInterface
    scheduledTaskRegistry: ScheduledTaskRegistryInterface
    scheduledTaskRepository: ScheduledTaskRepositoryInterface
    scheduledTaskRunRepository: ScheduledTaskRunRepositoryInterface
}
