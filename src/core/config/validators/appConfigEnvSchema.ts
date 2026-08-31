import { z } from 'zod'
import { isValidTimeZone } from '@core/utils'

const optionalNonEmptyString = () => z.preprocess(v => (v === '' ? undefined : v), z.string().min(1).optional())

export const appConfigEnvSchema = z
    .object({
        OPENAI_API_KEY: optionalNonEmptyString(),
        OPENAI_BASE_URL: optionalNonEmptyString(),
        OPENAI_ORGANIZATION: optionalNonEmptyString(),
        OPENAI_PROJECT: optionalNonEmptyString(),

        OPENROUTER_API_KEY: optionalNonEmptyString(),
        OPENROUTER_BASE_URL: optionalNonEmptyString(),
        OPENROUTER_HTTP_REFERER: optionalNonEmptyString(),
        OPENROUTER_TITLE: optionalNonEmptyString(),

        OLLAMA_BASE_URL: optionalNonEmptyString(),

        LMSTUDIO_BASE_URL: optionalNonEmptyString(),
        LMSTUDIO_API_KEY: optionalNonEmptyString(),

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

        USER_TIMEZONE: optionalNonEmptyString()
    })
    .superRefine((data, ctx) => {
        if (data.USER_TIMEZONE !== undefined && !isValidTimeZone(data.USER_TIMEZONE)) {
            ctx.addIssue({
                code: 'custom',
                path: ['USER_TIMEZONE'],
                message: `Invalid IANA time zone: ${data.USER_TIMEZONE}`
            })
        }
    })
