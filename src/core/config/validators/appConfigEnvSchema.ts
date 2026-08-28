import { z } from 'zod'
import { isValidTimeZone } from '@core/utils'

export const appConfigEnvSchema = z
    .object({
        OPENAI_API_KEY: z.string().min(1).optional(),
        OPENAI_BASE_URL: z.string().min(1).optional(),
        OPENAI_ORGANIZATION: z.string().min(1).optional(),
        OPENAI_PROJECT: z.string().min(1).optional(),

        OPENROUTER_API_KEY: z.string().min(1).optional(),
        OPENROUTER_BASE_URL: z.string().min(1).optional(),
        OPENROUTER_HTTP_REFERER: z.string().min(1).optional(),
        OPENROUTER_TITLE: z.string().min(1).optional(),

        SERVER_PORT: z.coerce.number().int().positive().default(3000),
        SERVER_HOST: z.string().min(1).default('0.0.0.0'),

        SKILLS_PATH: z.string().min(1).default('./data/skills'),
        MCP_CONFIG_PATH: z.string().min(1).default('./data/mcp.json'),
        AGENT_CONFIG_PATH: z.string().min(1).default('./data/agents.json'),
        SESSIONS_PATH: z.string().min(1).default('./data/sessions'),
        WORKFLOWS_PATH: z.string().min(1).default('./data/workflows'),
        WORKFLOW_RUNS_PATH: z.string().min(1).default('./data/workflows/runs'),
        CHANNEL_CONFIG_PATH: z.string().min(1).default('./data/channels.json'),
        TELEGRAM_STATE_PATH: z.string().min(1).default('./data/telegram-state.json'),
        GUARDRAIL_RULES_PATH: z.string().min(1).default('./data/guardrail-rules.json'),
        SCHEDULED_TASKS_PATH: z.string().min(1).default('./data/scheduled-tasks.json'),
        SCHEDULED_TASK_RUNS_PATH: z.string().min(1).default('./data/scheduler/runs'),

        MEMORY_PATH: z.string().min(1).default('./data/memory'),
        MEMORY_PERSISTENT_MAX_LINES: z.coerce.number().int().positive().default(200),
        MEMORY_PERSISTENT_MAX_BYTES: z.coerce.number().int().positive().default(25_600),

        USER_TIMEZONE: z.string().min(1).optional()
    })
    .superRefine((data, ctx) => {
        if (data.OPENAI_API_KEY === undefined && data.OPENROUTER_API_KEY === undefined) {
            ctx.addIssue({
                code: 'custom',
                path: ['OPENAI_API_KEY'],
                message:
                    'No provider API key found. Copy .env.example to .env (cp .env.example .env) and set OPENAI_API_KEY or OPENROUTER_API_KEY.'
            })
        }

        if (data.USER_TIMEZONE !== undefined && !isValidTimeZone(data.USER_TIMEZONE)) {
            ctx.addIssue({
                code: 'custom',
                path: ['USER_TIMEZONE'],
                message: `Invalid IANA time zone: ${data.USER_TIMEZONE}`
            })
        }
    })
