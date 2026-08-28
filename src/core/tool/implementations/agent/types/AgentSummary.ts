import { BudgetConfig } from '@agent/budget'
import { GuardrailRuleDecision } from '@guardrail'
import { AgentRole } from '@agent'

export type AgentSummary = {
    id: string
    name: string
    role: AgentRole
    description?: string
    model: string
    provider: string
    thinkingStrategy: string
    tools: Array<string>
    skills: Array<string>
    agents: Array<string>
    mcpServers: Array<string>
    workflows: Array<string>
    temperature?: number
    budget?: BudgetConfig
    guardrailRules?: Record<string, Record<string, GuardrailRuleDecision>>
    timezone?: string
    toolPatterns?: Array<string>
    skillPatterns?: Array<string>
    agentPatterns?: Array<string>
    mcpServerPatterns?: Array<string>
    workflowPatterns?: Array<string>
}
