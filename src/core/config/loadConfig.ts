import { stripUndefined } from '@core/utils'
import { AppConfig, OpenAIConfig, OpenRouterConfig, OllamaConfig, LMStudioConfig } from './types'
import { ConfigValidationError } from './errors'
import { appConfigEnvSchema } from './validators'

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
    const result = appConfigEnvSchema.safeParse(env)

    if (!result.success) {
        const issues = result.error.issues.map(issue => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n')

        throw new ConfigValidationError(`Invalid application configuration:\n${issues}`)
    }

    const data = result.data

    const openai = stripUndefined({
        apiKey: data.OPENAI_API_KEY,
        baseUrl: data.OPENAI_BASE_URL,
        organization: data.OPENAI_ORGANIZATION,
        project: data.OPENAI_PROJECT
    }) as OpenAIConfig

    const openrouter = stripUndefined({
        apiKey: data.OPENROUTER_API_KEY,
        baseUrl: data.OPENROUTER_BASE_URL,
        httpReferer: data.OPENROUTER_HTTP_REFERER,
        title: data.OPENROUTER_TITLE
    }) as OpenRouterConfig

    const ollama = stripUndefined({ baseUrl: data.OLLAMA_BASE_URL }) as OllamaConfig

    const lmstudio = stripUndefined({
        baseUrl: data.LMSTUDIO_BASE_URL,
        apiKey: data.LMSTUDIO_API_KEY
    }) as LMStudioConfig

    return {
        openai,
        openrouter,
        ollama,
        lmstudio,
        server: {
            port: data.SERVER_PORT,
            host: data.SERVER_HOST
        },
        paths: {
            skills: data.SKILLS_PATH,
            mcpConfig: data.MCP_CONFIG_PATH,
            agentConfig: data.AGENT_CONFIG_PATH,
            sessions: data.SESSIONS_PATH,
            workflows: data.WORKFLOWS_PATH,
            workflowRuns: data.WORKFLOW_RUNS_PATH,
            channelConfig: data.CHANNEL_CONFIG_PATH,
            telegramState: data.TELEGRAM_STATE_PATH,
            guardrailRules: data.GUARDRAIL_RULES_PATH,
            scheduledTasks: data.SCHEDULED_TASKS_PATH,
            scheduledTaskRuns: data.SCHEDULED_TASK_RUNS_PATH
        },
        memory: {
            path: data.MEMORY_PATH,
            persistentMaxLines: data.MEMORY_PERSISTENT_MAX_LINES,
            persistentMaxBytes: data.MEMORY_PERSISTENT_MAX_BYTES
        },
        ...(data.USER_TIMEZONE !== undefined && { userTimezone: data.USER_TIMEZONE })
    }
}
