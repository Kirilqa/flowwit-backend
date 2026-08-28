import { ProviderInterface } from '@provider'
import { AgentInterface } from '../interfaces'
import { BudgetConfig } from '../budget'
import { GuardrailRuleDecision } from '@guardrail'
import { MCPClientInterface } from '@mcp'
import { AgentRole } from './AgentRole'
import { Skill } from '@skill'
import { ThinkingStrategyInterface } from '@strategy'
import { ToolInterface } from '@tool'
import { WorkFlowInterface } from '@workflow'

export type AgentConfig = {
    id: string
    name: string
    role: AgentRole
    description?: string
    provider: ProviderInterface
    model: string
    systemPrompt: string
    thinkingStrategy: ThinkingStrategyInterface
    tools?: Array<ToolInterface>
    skills?: Array<Skill>
    agents?: Array<AgentInterface>
    mcpServers?: Array<MCPClientInterface>
    workflows?: Array<WorkFlowInterface>
    budget?: BudgetConfig
    temperature?: number
    guardrailRules?: Record<string, Record<string, GuardrailRuleDecision>>
    timezone?: string
}
