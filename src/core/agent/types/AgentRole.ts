export const AGENT_ROLE = {
    ASSISTANT: 'assistant',
    ORCHESTRATOR: 'orchestrator',
    SPECIALIST: 'specialist',
    REVIEWER: 'reviewer'
} as const

export type AgentRole = (typeof AGENT_ROLE)[keyof typeof AGENT_ROLE]
