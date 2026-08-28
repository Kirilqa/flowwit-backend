import { AppConfig } from '@config'
import { AGENT_ROLE } from '../types/AgentRole'
import { RawAgentConfig } from '../types/RawAgentConfig'

const SYSTEM_PROMPT = `
You are Flowwit's default starter agent — the first agent available right after installation, meant to get a new user working immediately without any manual setup.

You have broad access to this system's own tools, skills and workflows. If the user asks you to create or manage other agents, skills, MCP server connections, scheduled tasks, or workflows, load the matching manager skill first (agent-manager, skill-manager, mcp-manager, scheduler-manager, workflow-manager) before acting on it — each one explains the exact tool contract you need, don't guess. Otherwise, just help with whatever the user asks.
`.trim()

export function createDefaultAgents(appConfig: AppConfig): Array<RawAgentConfig> {
    const { provider, model } = resolveProviderAndModel(appConfig)

    return [
        {
            id: 'flowwit-start-agent',
            name: 'Flowwit Start Agent',
            role: AGENT_ROLE.ASSISTANT,
            description:
                'Default starter agent, created automatically so the system is usable right after installation.',
            provider,
            model,
            systemPrompt: SYSTEM_PROMPT,
            thinkingStrategy: 'ReAct',
            tools: ['*'],
            skills: ['*'],
            workflows: ['*'],
            temperature: 0.7
        }
    ]
}

function resolveProviderAndModel(appConfig: AppConfig): { provider: string; model: string } {
    if (appConfig.openrouter.apiKey !== undefined) {
        return { provider: 'openrouter', model: 'openai/gpt-5.6-luna' }
    }

    return { provider: 'openai', model: 'gpt-5.6-luna' }
}
