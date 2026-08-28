import { AgentConfig } from '../types'

export function buildAgentIdentityPrompt(config: AgentConfig): string {
    const lines = [
        `- ID: ${config.id}`,
        `- Name: ${config.name}`,
        `- Role: ${config.role}`,
        `- Provider: ${config.provider.name}`,
        `- Model: ${config.model}`,
        ...(config.description !== undefined ? [`- Description: ${config.description}`] : [])
    ]

    return `## Identity\n${lines.join('\n')}`
}
