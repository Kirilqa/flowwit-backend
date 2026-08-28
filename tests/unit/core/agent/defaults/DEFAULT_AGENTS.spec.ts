import { createDefaultAgents } from '@agent/defaults/DEFAULT_AGENTS'
import { AppConfig } from '@config'

function makeAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
    return {
        openai: {},
        openrouter: {},
        server: { port: 3000, host: '0.0.0.0' },
        paths: {
            skills: './skills',
            mcpConfig: './mcp.json',
            agentConfig: './agents.json',
            sessions: './sessions',
            workflows: './workflows',
            workflowRuns: './workflows/runs',
            channelConfig: './channels.json',
            telegramState: './telegram-state.json',
            guardrailRules: './guardrail-rules.json',
            scheduledTasks: './scheduled-tasks.json',
            scheduledTaskRuns: './scheduler/runs'
        },
        memory: { path: './memory', persistentMaxLines: 200, persistentMaxBytes: 25_600 },
        ...overrides
    }
}

describe('createDefaultAgents', () => {
    it('returns exactly one agent', () => {
        const agents = createDefaultAgents(makeAppConfig({ openrouter: { apiKey: 'sk-or-test' } }))
        expect(agents).toHaveLength(1)
    })

    it('uses openrouter with the openrouter-slugged model when OPENROUTER_API_KEY is set', () => {
        const [agent] = createDefaultAgents(makeAppConfig({ openrouter: { apiKey: 'sk-or-test' } }))
        expect(agent?.provider).toBe('openrouter')
        expect(agent?.model).toBe('openai/gpt-5.6-luna')
    })

    it('prefers openrouter over openai when both keys are set', () => {
        const [agent] = createDefaultAgents(
            makeAppConfig({ openai: { apiKey: 'sk-test' }, openrouter: { apiKey: 'sk-or-test' } })
        )
        expect(agent?.provider).toBe('openrouter')
    })

    it('falls back to openai with the bare model name when only OPENAI_API_KEY is set', () => {
        const [agent] = createDefaultAgents(makeAppConfig({ openai: { apiKey: 'sk-test' } }))
        expect(agent?.provider).toBe('openai')
        expect(agent?.model).toBe('gpt-5.6-luna')
    })

    it('grants broad access via wildcard patterns', () => {
        const [agent] = createDefaultAgents(makeAppConfig({ openrouter: { apiKey: 'sk-or-test' } }))
        expect(agent?.tools).toEqual(['*'])
        expect(agent?.skills).toEqual(['*'])
    })

    it('has a stable, recognizable id', () => {
        const [agent] = createDefaultAgents(makeAppConfig({ openrouter: { apiKey: 'sk-or-test' } }))
        expect(agent?.id).toBe('flowwit-start-agent')
    })
})
