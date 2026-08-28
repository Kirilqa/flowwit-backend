import { z } from 'zod'
import { AGENT_ROLE } from '@agent'
import { GUARDRAIL_RULE_DECISION } from '@guardrail'

const budgetSchema = z.object({
    maxTokens: z.number().optional(),
    maxIterations: z.number().optional(),
    maxToolCalls: z.number().optional(),
    maxCostUsd: z.number().optional(),
    maxDurationMs: z.number().optional()
})

const guardrailRuleDecisionSchema = z.enum([
    GUARDRAIL_RULE_DECISION.APPROVE_ALWAYS,
    GUARDRAIL_RULE_DECISION.DENY_ALWAYS
])

const guardrailRuleEntrySchema = z.object({
    guardrailId: z.string().min(1).describe('Guardrail id, e.g. "tool_permission" or "shell_command"'),
    ruleKey: z
        .string()
        .min(1)
        .describe(
            'Rule key, meaning depends on the guardrail: for "tool_permission" it is a tool name or glob pattern, for "shell_command" it is the first word of a shell command or glob pattern'
        ),
    decision: guardrailRuleDecisionSchema
})

export const createAgentToolSchema = z.object({
    id: z.string().min(1).describe('Unique identifier for the agent'),
    name: z.string().min(1).describe('Human-readable name for the agent'),
    role: z.enum(AGENT_ROLE).describe('Agent role'),
    description: z.string().optional().describe('Short description of what the agent does'),
    provider: z.string().min(1).describe('Provider name, e.g. "openai" or "openrouter"'),
    model: z.string().min(1).describe('Model identifier, e.g. "gpt-4o"'),
    systemPrompt: z.string().min(1).describe('System prompt for the agent'),
    thinkingStrategy: z.string().min(1).describe('Thinking strategy name, e.g. "react"'),
    tools: z
        .array(z.string())
        .optional()
        .describe('List of tool name glob patterns to assign to the agent, e.g. "fs_*" or "*"'),
    skills: z.array(z.string()).optional().describe('List of skill name glob patterns to assign to the agent'),
    agents: z.array(z.string()).optional().describe('List of sub-agent ID glob patterns to assign to the agent'),
    mcpServers: z.array(z.string()).optional().describe('List of MCP server name glob patterns to assign to the agent'),
    workflows: z.array(z.string()).optional().describe('List of workflow ID glob patterns to assign to the agent'),
    budget: budgetSchema.optional().describe('Budget constraints for the agent'),
    temperature: z.number().min(0).max(2).optional().describe('Sampling temperature'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Arbitrary metadata key-value pairs'),
    timezone: z
        .string()
        .min(1)
        .optional()
        .describe(
            'IANA time zone (e.g. "Europe/Moscow") shown to this agent as its "user time". Falls back to the server-wide default if not set.'
        ),
    guardrailRules: z
        .array(guardrailRuleEntrySchema)
        .optional()
        .describe('Initial guardrail permission rules scoped to this agent')
})
