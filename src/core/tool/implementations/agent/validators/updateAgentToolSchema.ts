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

const guardrailRuleSetEntrySchema = z.object({
    guardrailId: z.string().min(1).describe('Guardrail id, e.g. "tool_permission" or "shell_command"'),
    ruleKey: z
        .string()
        .min(1)
        .describe(
            'Rule key, meaning depends on the guardrail: for "tool_permission" it is a tool name or glob pattern, for "shell_command" it is the first word of a shell command or glob pattern'
        ),
    decision: guardrailRuleDecisionSchema
})

const guardrailRuleRemoveEntrySchema = z.object({
    guardrailId: z.string().min(1),
    ruleKey: z.string().min(1)
})

export const updateAgentToolSchema = z.object({
    agentId: z.string().min(1).describe('ID of the agent to update'),
    name: z.string().min(1).optional().describe('New human-readable name'),
    role: z.enum(AGENT_ROLE).optional().describe('New agent role'),
    description: z.string().optional().describe('New description'),
    provider: z.string().min(1).optional().describe('New provider name'),
    model: z.string().min(1).optional().describe('New model identifier'),
    systemPrompt: z.string().min(1).optional().describe('New system prompt'),
    thinkingStrategy: z.string().min(1).optional().describe('New thinking strategy name'),
    addTools: z
        .array(z.string())
        .optional()
        .describe('Tool name glob patterns to add to the existing set, e.g. "fs_*" or "*"'),
    removeTools: z
        .array(z.string())
        .optional()
        .describe(
            'Glob pattern strings to remove. Must match a previously granted pattern exactly as it was added (e.g. "fs_*") — not re-evaluated as a new glob against current tool names. A pattern not currently present is silently ignored. Check agent_info\'s "toolPatterns" field first if you do not remember the exact pattern that was granted.'
        ),
    addSkills: z.array(z.string()).optional().describe('Skill name glob patterns to add to the existing set'),
    removeSkills: z
        .array(z.string())
        .optional()
        .describe(
            'Glob pattern strings to remove from skills — same exact-match rule as removeTools, check agent_info\'s "skillPatterns" field first if unsure'
        ),
    addAgents: z.array(z.string()).optional().describe('Sub-agent ID glob patterns to add to the existing set'),
    removeAgents: z
        .array(z.string())
        .optional()
        .describe(
            'Glob pattern strings to remove from sub-agents — same exact-match rule as removeTools, check agent_info\'s "agentPatterns" field first if unsure'
        ),
    addMcpServers: z.array(z.string()).optional().describe('MCP server name glob patterns to add to the existing set'),
    removeMcpServers: z
        .array(z.string())
        .optional()
        .describe(
            'Glob pattern strings to remove from MCP servers — same exact-match rule as removeTools, check agent_info\'s "mcpServerPatterns" field first if unsure'
        ),
    addWorkflows: z.array(z.string()).optional().describe('WorkFlow ID glob patterns to add to the existing set'),
    removeWorkflows: z
        .array(z.string())
        .optional()
        .describe(
            'Glob pattern strings to remove from workflows — same exact-match rule as removeTools, check agent_info\'s "workflowPatterns" field first if unsure'
        ),
    budget: budgetSchema.optional().describe('New budget constraints, replaces the existing budget entirely'),
    temperature: z.number().min(0).max(2).optional().describe('New sampling temperature'),
    timezone: z
        .string()
        .min(1)
        .optional()
        .describe(
            'New IANA time zone (e.g. "Europe/Moscow") shown to this agent as its "user time", replaces the existing one'
        ),
    metadata: z.record(z.string(), z.unknown()).optional().describe('New metadata (replaces existing)'),
    setGuardrailRules: z
        .array(guardrailRuleSetEntrySchema)
        .optional()
        .describe('Guardrail permission rules to create or overwrite for this agent'),
    removeGuardrailRules: z
        .array(guardrailRuleRemoveEntrySchema)
        .optional()
        .describe(
            'Guardrail permission rules to remove for this agent, identified by the exact (guardrailId, ruleKey) pair — silently ignored if not currently set'
        )
})
