import { z } from 'zod'
import { isValidTimeZone, stripUndefined } from '@core/utils'
import { GUARDRAIL_RULE_DECISION } from '@guardrail'
import { AGENT_ROLE } from '../types'
import { RawAgentConfig } from '../types/RawAgentConfig'

const guardrailRuleDecisionSchema = z.enum([
    GUARDRAIL_RULE_DECISION.APPROVE_ALWAYS,
    GUARDRAIL_RULE_DECISION.DENY_ALWAYS
])

export const agentConfigSchema: z.ZodType<RawAgentConfig> = z
    .object({
        id: z.string().min(1),
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
        guardrailRules: z.record(z.string(), z.record(z.string(), guardrailRuleDecisionSchema)).optional(),
        timezone: z.string().min(1).optional()
    })
    .superRefine((data, ctx) => {
        if (data.timezone !== undefined && !isValidTimeZone(data.timezone)) {
            ctx.addIssue({ code: 'custom', path: ['timezone'], message: `Invalid IANA time zone: ${data.timezone}` })
        }
    })
    .transform(raw => stripUndefined(raw) as RawAgentConfig)
