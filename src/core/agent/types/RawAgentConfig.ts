import { AgentRole } from './AgentRole'
import { BudgetConfig } from '../budget'
import { GuardrailRuleDecision } from '@guardrail'

export type RawAgentConfig = {
    id: string
    name: string
    role: AgentRole
    description?: string
    provider: string
    model: string
    systemPrompt: string
    thinkingStrategy: string
    tools?: Array<string>
    skills?: Array<string>
    agents?: Array<string>
    mcpServers?: Array<string>
    workflows?: Array<string>
    budget?: BudgetConfig
    temperature?: number
    guardrailRules?: Record<string, Record<string, GuardrailRuleDecision>>
    timezone?: string
}
