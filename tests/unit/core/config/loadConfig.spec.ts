import { loadConfig, ConfigValidationError } from '@config'

const BASE_ENV: NodeJS.ProcessEnv = { OPENAI_API_KEY: 'sk-openai-test' }

describe('loadConfig', () => {
    it('defaults to process.env when no env argument is provided', () => {
        const original = process.env['OPENAI_API_KEY']
        process.env['OPENAI_API_KEY'] = 'sk-from-process-env'
        try {
            const config = loadConfig()
            expect(config.openai.apiKey).toBe('sk-from-process-env')
        } finally {
            if (original === undefined) {
                delete process.env['OPENAI_API_KEY']
            } else {
                process.env['OPENAI_API_KEY'] = original
            }
        }
    })

    it('loads successfully with no provider configured at all (schema no longer enforces this)', () => {
        const config = loadConfig({})
        expect(config.openai.apiKey).toBeUndefined()
        expect(config.openrouter.apiKey).toBeUndefined()
        expect(config.ollama.baseUrl).toBeUndefined()
    })

    it('loads successfully with only OPENAI_API_KEY set', () => {
        const config = loadConfig(BASE_ENV)
        expect(config.openai.apiKey).toBe('sk-openai-test')
        expect(config.openrouter.apiKey).toBeUndefined()
    })

    it('loads successfully with only OPENROUTER_API_KEY set', () => {
        const config = loadConfig({ OPENROUTER_API_KEY: 'sk-openrouter-test' })
        expect(config.openrouter.apiKey).toBe('sk-openrouter-test')
        expect(config.openai.apiKey).toBeUndefined()
    })

    it('omits optional provider fields entirely when not set, rather than setting them to undefined', () => {
        const config = loadConfig(BASE_ENV)
        expect('baseUrl' in config.openai).toBe(false)
        expect('organization' in config.openai).toBe(false)
        expect('project' in config.openai).toBe(false)
    })

    it('reads optional OpenAI provider options from env', () => {
        const config = loadConfig({
            ...BASE_ENV,
            OPENAI_BASE_URL: 'https://proxy.example.com/v1',
            OPENAI_ORGANIZATION: 'org-1',
            OPENAI_PROJECT: 'proj-1'
        })
        expect(config.openai.baseUrl).toBe('https://proxy.example.com/v1')
        expect(config.openai.organization).toBe('org-1')
        expect(config.openai.project).toBe('proj-1')
    })

    it('treats present-but-empty optional string env vars as unset rather than failing validation', () => {
        const config = loadConfig({
            ...BASE_ENV,
            OPENAI_BASE_URL: '',
            OPENAI_ORGANIZATION: '',
            OPENAI_PROJECT: '',
            OPENROUTER_API_KEY: '',
            OPENROUTER_BASE_URL: '',
            OPENROUTER_HTTP_REFERER: '',
            OPENROUTER_TITLE: '',
            USER_TIMEZONE: ''
        })

        expect('baseUrl' in config.openai).toBe(false)
        expect('organization' in config.openai).toBe(false)
        expect('project' in config.openai).toBe(false)
        expect(config.openrouter).toEqual({})
        expect('userTimezone' in config).toBe(false)
    })

    it('does not crash on a Docker-style .env with one real key and the other left blank', () => {
        const config = loadConfig({ OPENAI_API_KEY: 'sk-real', OPENROUTER_API_KEY: '' })
        expect(config.openai.apiKey).toBe('sk-real')
        expect(config.openrouter).toEqual({})
    })

    it('loads successfully when both provider keys are present but empty, treating them as unset', () => {
        const config = loadConfig({ OPENAI_API_KEY: '', OPENROUTER_API_KEY: '' })
        expect(config.openai).toEqual({})
        expect(config.openrouter).toEqual({})
    })

    it('omits ollama.baseUrl entirely when OLLAMA_BASE_URL is not set, rather than defaulting it', () => {
        const config = loadConfig(BASE_ENV)
        expect('baseUrl' in config.ollama).toBe(false)
    })

    it('reads OLLAMA_BASE_URL from env when explicitly set', () => {
        const config = loadConfig({ ...BASE_ENV, OLLAMA_BASE_URL: 'http://192.168.1.50:11434' })
        expect(config.ollama.baseUrl).toBe('http://192.168.1.50:11434')
    })

    it('treats a present-but-empty OLLAMA_BASE_URL as unset', () => {
        const config = loadConfig({ ...BASE_ENV, OLLAMA_BASE_URL: '' })
        expect('baseUrl' in config.ollama).toBe(false)
    })

    it('omits lmstudio fields entirely when not set, rather than defaulting them', () => {
        const config = loadConfig(BASE_ENV)
        expect('baseUrl' in config.lmstudio).toBe(false)
        expect('apiKey' in config.lmstudio).toBe(false)
    })

    it('reads LMSTUDIO_BASE_URL and LMSTUDIO_API_KEY from env when explicitly set', () => {
        const config = loadConfig({
            ...BASE_ENV,
            LMSTUDIO_BASE_URL: 'http://192.168.1.50:1234',
            LMSTUDIO_API_KEY: 'sk-lm-test'
        })
        expect(config.lmstudio.baseUrl).toBe('http://192.168.1.50:1234')
        expect(config.lmstudio.apiKey).toBe('sk-lm-test')
    })

    it('allows LMSTUDIO_BASE_URL to be set without LMSTUDIO_API_KEY, since the key is optional', () => {
        const config = loadConfig({ ...BASE_ENV, LMSTUDIO_BASE_URL: 'http://localhost:1234' })
        expect(config.lmstudio.baseUrl).toBe('http://localhost:1234')
        expect('apiKey' in config.lmstudio).toBe(false)
    })

    it('treats present-but-empty LMSTUDIO_BASE_URL and LMSTUDIO_API_KEY as unset', () => {
        const config = loadConfig({ ...BASE_ENV, LMSTUDIO_BASE_URL: '', LMSTUDIO_API_KEY: '' })
        expect(config.lmstudio).toEqual({})
    })

    it('reads optional OpenRouter provider options from env', () => {
        const config = loadConfig({
            OPENROUTER_API_KEY: 'sk-openrouter-test',
            OPENROUTER_BASE_URL: 'https://proxy.example.com/api/v1',
            OPENROUTER_HTTP_REFERER: 'https://my-app.example.com',
            OPENROUTER_TITLE: 'My App'
        })
        expect(config.openrouter.baseUrl).toBe('https://proxy.example.com/api/v1')
        expect(config.openrouter.httpReferer).toBe('https://my-app.example.com')
        expect(config.openrouter.title).toBe('My App')
    })

    it('applies default server port and host when not set', () => {
        const config = loadConfig(BASE_ENV)
        expect(config.server.port).toBe(3000)
        expect(config.server.host).toBe('0.0.0.0')
    })

    it('coerces SERVER_PORT from string to number', () => {
        const config = loadConfig({ ...BASE_ENV, SERVER_PORT: '8080' })
        expect(config.server.port).toBe(8080)
    })

    it('overrides server host from env', () => {
        const config = loadConfig({ ...BASE_ENV, SERVER_HOST: '127.0.0.1' })
        expect(config.server.host).toBe('127.0.0.1')
    })

    it('throws ConfigValidationError for a non-numeric SERVER_PORT', () => {
        expect(() => loadConfig({ ...BASE_ENV, SERVER_PORT: 'not-a-number' })).toThrow(ConfigValidationError)
    })

    it('applies default paths when not set', () => {
        const config = loadConfig(BASE_ENV)
        expect(config.paths).toEqual({
            skills: './data/skills',
            mcpConfig: './data/mcp.json',
            agentConfig: './data/agents.json',
            sessions: './data/sessions',
            workflows: './data/workflows',
            workflowRuns: './data/workflows/runs',
            channelConfig: './data/channels.json',
            telegramState: './data/telegram-state.json',
            guardrailRules: './data/guardrail-rules.json',
            scheduledTasks: './data/scheduled-tasks.json',
            scheduledTaskRuns: './data/scheduler/runs'
        })
    })

    it('overrides paths from env', () => {
        const config = loadConfig({ ...BASE_ENV, SKILLS_PATH: '/data/skills', SESSIONS_PATH: '/data/sessions' })
        expect(config.paths.skills).toBe('/data/skills')
        expect(config.paths.sessions).toBe('/data/sessions')
    })

    it('applies default memory config when not set', () => {
        const config = loadConfig(BASE_ENV)
        expect(config.memory).toEqual({
            path: './data/memory',
            persistentMaxLines: 200,
            persistentMaxBytes: 25_600
        })
    })

    it('overrides memory config from env', () => {
        const config = loadConfig({
            ...BASE_ENV,
            MEMORY_PATH: '/data/memory',
            MEMORY_PERSISTENT_MAX_LINES: '50',
            MEMORY_PERSISTENT_MAX_BYTES: '1000'
        })
        expect(config.memory).toEqual({
            path: '/data/memory',
            persistentMaxLines: 50,
            persistentMaxBytes: 1000
        })
    })
})
