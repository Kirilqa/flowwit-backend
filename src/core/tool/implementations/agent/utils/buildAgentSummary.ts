import { AgentInterface, RawAgentConfig } from '@agent'
import { AgentSummary } from '../types'

export const buildAgentSummary = (agent: AgentInterface, rawConfig?: RawAgentConfig | null): AgentSummary => {
    const { config } = agent

    return {
        id: config.id,
        name: config.name,
        role: config.role,
        model: config.model,
        provider: config.provider.name,
        thinkingStrategy: config.thinkingStrategy.name,
        tools: config.tools?.map(t => t.name) ?? [],
        skills: config.skills?.map(s => s.name) ?? [],
        agents: config.agents?.map(a => a.config.id) ?? [],
        mcpServers: config.mcpServers?.map(s => s.alias) ?? [],
        workflows: config.workflows?.map(w => w.id) ?? [],
        ...(config.description !== undefined && { description: config.description }),
        ...(config.temperature !== undefined && { temperature: config.temperature }),
        ...(config.budget !== undefined && { budget: config.budget }),
        ...(config.guardrailRules !== undefined && { guardrailRules: config.guardrailRules }),
        ...(config.timezone !== undefined && { timezone: config.timezone }),
        ...(rawConfig?.tools !== undefined && { toolPatterns: rawConfig.tools }),
        ...(rawConfig?.skills !== undefined && { skillPatterns: rawConfig.skills }),
        ...(rawConfig?.agents !== undefined && { agentPatterns: rawConfig.agents }),
        ...(rawConfig?.mcpServers !== undefined && { mcpServerPatterns: rawConfig.mcpServers }),
        ...(rawConfig?.workflows !== undefined && { workflowPatterns: rawConfig.workflows })
    }
}
