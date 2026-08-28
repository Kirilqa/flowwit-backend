import { AgentConfig, RawAgentConfig } from '../types'

export const dehydrateAgentConfig = (config: AgentConfig): RawAgentConfig => ({
    id: config.id,
    name: config.name,
    role: config.role,
    provider: config.provider.name,
    model: config.model,
    systemPrompt: config.systemPrompt,
    thinkingStrategy: config.thinkingStrategy.name,
    ...(config.description !== undefined && { description: config.description }),
    ...(config.tools !== undefined && config.tools.length > 0 && { tools: config.tools.map(tool => tool.name) }),
    ...(config.skills !== undefined && config.skills.length > 0 && { skills: config.skills.map(skill => skill.name) }),
    ...(config.agents !== undefined &&
        config.agents.length > 0 && { agents: config.agents.map(agent => agent.config.id) }),
    ...(config.mcpServers !== undefined &&
        config.mcpServers.length > 0 && { mcpServers: config.mcpServers.map(server => server.alias) }),
    ...(config.workflows !== undefined &&
        config.workflows.length > 0 && { workflows: config.workflows.map(workflow => workflow.id) }),
    ...(config.budget !== undefined && { budget: config.budget }),
    ...(config.temperature !== undefined && { temperature: config.temperature }),
    ...(config.guardrailRules !== undefined && { guardrailRules: config.guardrailRules }),
    ...(config.timezone !== undefined && { timezone: config.timezone })
})
