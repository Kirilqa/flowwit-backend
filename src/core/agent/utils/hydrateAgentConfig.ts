import { LoggerInterface } from '@logger'
import { AgentConfig, AgentConfigRegistryDependencies, RawAgentConfig } from '../types'
import { resolveByPatterns } from './resolveByPatterns'

export const hydrateAgentConfig = (
    rawAgentConfig: RawAgentConfig,
    dependencies: AgentConfigRegistryDependencies,
    logger: LoggerInterface,
    defaultTimezone?: string
): AgentConfig | null => {
    const provider = dependencies.providerRegistry.get(rawAgentConfig.provider)

    if (provider === null) {
        logger.warn(`Provider "${rawAgentConfig.provider}" not found in registry, skipping agent`, {
            agentName: rawAgentConfig.name
        })
        return null
    }

    const thinkingStrategy = dependencies.thinkingStrategyRegistry.get(rawAgentConfig.thinkingStrategy)

    if (thinkingStrategy === null) {
        logger.warn(`ThinkingStrategy "${rawAgentConfig.thinkingStrategy}" not found in registry, skipping agent`, {
            agentName: rawAgentConfig.name
        })
        return null
    }

    const onUnmatchedPattern = (entityType: string, pattern: string, agentName: string): void => {
        logger.warn(`${entityType} pattern matched nothing in registry`, { pattern, agentName })
    }

    const tools =
        rawAgentConfig.tools !== undefined
            ? resolveByPatterns(
                  rawAgentConfig.tools,
                  dependencies.toolRegistry.list(),
                  tool => tool.name,
                  'Tool',
                  rawAgentConfig.name,
                  onUnmatchedPattern
              )
            : []

    const skills =
        rawAgentConfig.skills !== undefined
            ? resolveByPatterns(
                  rawAgentConfig.skills,
                  dependencies.skillRegistry.list(),
                  skill => skill.name,
                  'Skill',
                  rawAgentConfig.name,
                  onUnmatchedPattern
              )
            : []

    const agents =
        rawAgentConfig.agents !== undefined
            ? resolveByPatterns(
                  rawAgentConfig.agents,
                  dependencies.agentRegistry.list(),
                  agent => agent.config.id,
                  'Agent',
                  rawAgentConfig.name,
                  onUnmatchedPattern
              )
            : []

    const mcpServers =
        rawAgentConfig.mcpServers !== undefined
            ? resolveByPatterns(
                  rawAgentConfig.mcpServers,
                  dependencies.mcpServerRegistry.list(),
                  server => server.alias,
                  'MCP server',
                  rawAgentConfig.name,
                  onUnmatchedPattern
              )
            : []

    const workflows =
        rawAgentConfig.workflows !== undefined
            ? resolveByPatterns(
                  rawAgentConfig.workflows,
                  dependencies.workflowRegistry.list(),
                  workflow => workflow.id,
                  'WorkFlow',
                  rawAgentConfig.name,
                  onUnmatchedPattern
              )
            : []

    const timezone = rawAgentConfig.timezone ?? defaultTimezone

    return {
        id: rawAgentConfig.id,
        name: rawAgentConfig.name,
        role: rawAgentConfig.role,
        provider,
        model: rawAgentConfig.model,
        systemPrompt: rawAgentConfig.systemPrompt,
        thinkingStrategy,
        ...(rawAgentConfig.description !== undefined && { description: rawAgentConfig.description }),
        ...(tools.length > 0 && { tools }),
        ...(skills.length > 0 && { skills }),
        ...(agents.length > 0 && { agents }),
        ...(mcpServers.length > 0 && { mcpServers }),
        ...(workflows.length > 0 && { workflows }),
        ...(rawAgentConfig.budget !== undefined && { budget: rawAgentConfig.budget }),
        ...(rawAgentConfig.temperature !== undefined && { temperature: rawAgentConfig.temperature }),
        ...(rawAgentConfig.guardrailRules !== undefined && { guardrailRules: rawAgentConfig.guardrailRules }),
        ...(timezone !== undefined && { timezone })
    }
}
