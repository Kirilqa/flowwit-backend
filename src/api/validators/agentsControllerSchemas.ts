import { z } from 'zod'
import { GUARDRAIL_RULE_DECISION } from '@guardrail'
import { AGENT_ROLE } from '@agent/types'

export const agentParamsSchema = z.object({
    agentId: z.string()
})

const guardrailRuleDecisionSchema = z.enum([
    GUARDRAIL_RULE_DECISION.APPROVE_ALWAYS,
    GUARDRAIL_RULE_DECISION.DENY_ALWAYS
])

const guardrailRulesSchema = z.record(z.string(), z.record(z.string(), guardrailRuleDecisionSchema))

export const agentBodySchema = z.object({
    name: z.string().min(1),
    role: z.enum([AGENT_ROLE.ASSISTANT, AGENT_ROLE.ORCHESTRATOR, AGENT_ROLE.SPECIALIST, AGENT_ROLE.REVIEWER]),
    description: z.string().optional(),
    provider: z.string().min(1),
    model: z.string().min(1),
    systemPrompt: z.string(),
    thinkingStrategy: z.string().min(1),
    tools: z.array(z.string().min(1)).optional(),
    skills: z.array(z.string().min(1)).optional(),
    agents: z.array(z.string().min(1)).optional(),
    mcpServers: z.array(z.string().min(1)).optional(),
    workflows: z.array(z.string().min(1)).optional(),
    budget: z
        .object({
            maxTokens: z.number().positive().optional(),
            maxIterations: z.number().positive().optional(),
            maxToolCalls: z.number().positive().optional(),
            maxCostUsd: z.number().positive().optional(),
            maxDurationMs: z.number().positive().optional()
        })
        .optional(),
    temperature: z.number().min(0).max(2).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    timezone: z.string().min(1).optional(),
    guardrailRules: guardrailRulesSchema.optional()
})
