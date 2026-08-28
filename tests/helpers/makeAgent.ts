import { Agent } from '@agent/implementations/Agent'
import { AgentInterface } from '@agent/interfaces/AgentInterface'
import { AgentRegistryInterface } from '@agent/interfaces/registries/AgentRegistryInterface'
import { AgentConfig } from '@agent/types/AgentConfig'
import { AgentConfigRegistryDependencies } from '@agent/types/AgentConfigRegistryDependencies'
import { AgentDependencies } from '@agent/types/AgentDependencies'
import { AGENT_ROLE } from '@agent/types/AgentRole'
import { RawAgentConfig } from '@agent/types/RawAgentConfig'
import { RawAgentConfigRepositoryInterface } from '@agent/interfaces/repositories/AgentConfigRepositoryInterface'
import { BudgetFactory, BudgetInterface } from '@agent/budget'
import { GUARDRAIL_ACTION, GuardrailInterface, GuardrailResolverInterface } from '@guardrail'
import { MCPServerRegistryInterface, MCPClientInterface } from '@mcp'
import { MemoryEntry, MemoryEntryPatch, MemoryInterface, MemoryPartition, MemoryRepositoryInterface } from '@memory'
import { ObservabilityInterface, ObservabilityTrace } from '@observability'
import { Session } from '@session/implementations/session/Session'
import { SessionInterface, SessionManagerInterface } from '@session'
import { ThinkingStrategyRegistryInterface, ReActStrategy } from '@strategy'
import { StructuredOutputExtractorInterface } from '@agent/structured/interfaces/StructuredOutputExtractorInterface'
import { Skill, SkillRegistryInterface, SkillRepositoryInterface } from '@skill'
import { ToolOrchestratorInterface } from '@agent/toolOrchestrator'
import { ToolInterface } from '@tool/interfaces/ToolInterface'
import { ToolRegistryInterface } from '@tool/interfaces'
import { ToolResult } from '@tool/types/ToolResult'
import { WorkFlowRegistryInterface } from '@workflow'
import { ProviderInterface, ProviderRegistryInterface } from '@provider'
import { makeProvider, TEST_MODEL, TestProvider } from './TestProvider'

export function makeObservability(): ObservabilityInterface {
    const trace: ObservabilityTrace = {
        id: 'trace-1',
        agentId: 'test',
        sessionId: 'test',
        startedAt: 0,
        spans: [],
        totalTokens: 0,
        totalCostUsd: 0
    }
    return {
        startTrace: jest.fn().mockResolvedValue(trace),
        endTrace: jest.fn().mockResolvedValue(undefined),
        startSpan: jest.fn().mockResolvedValue(undefined),
        endSpan: jest.fn().mockResolvedValue(undefined),
        recordEvent: jest.fn().mockResolvedValue(undefined),
        getTrace: jest.fn().mockResolvedValue(null),
        listTraces: jest.fn().mockResolvedValue([])
    }
}

export function makeToolOrchestrator(result?: ToolResult): ToolOrchestratorInterface {
    return {
        buildPool: jest.fn().mockResolvedValue({}),
        buildTools: jest.fn().mockReturnValue([]),
        execute: jest.fn().mockResolvedValue(result ?? { id: 'call-1', name: 'tool', output: 'ok', isError: false })
    }
}

export function makePassthroughGuardrail(): GuardrailInterface {
    return {
        id: 'passthrough-guardrail',
        async *checkInput() {
            return { action: GUARDRAIL_ACTION.ALLOW }
        },
        async *checkOutput() {
            return { action: GUARDRAIL_ACTION.ALLOW }
        },
        async *checkToolCall() {
            return { action: GUARDRAIL_ACTION.ALLOW }
        }
    }
}

export function makeGuardrailResolver(): GuardrailResolverInterface {
    return {
        resolve: jest.fn(),
        abort: jest.fn()
    }
}

export function makeBudget(): BudgetInterface {
    return {
        initialize: jest.fn(),
        getState: jest.fn().mockReturnValue({
            usedTokens: 0,
            usedIterations: 0,
            usedToolCalls: 0,
            usedCostUsd: 0,
            elapsedMs: 0
        }),
        trackTokens: jest.fn(),
        trackToolCall: jest.fn(),
        trackIteration: jest.fn(),
        check: jest.fn().mockReturnValue({ exceeded: false })
    }
}

export function makeBudgetFactory(): BudgetFactory {
    return jest.fn().mockReturnValue(makeBudget())
}

export function makeStructuredOutputExtractor(): StructuredOutputExtractorInterface {
    return {
        extract(_provider, _model, _messages, _outputSchema, _agentId, _sessionId) {
            return (async function* () {})()
        }
    }
}

export function makeMemory(): MemoryInterface {
    return {
        buildPrompt: jest.fn().mockResolvedValue(undefined),
        consolidate: jest.fn().mockResolvedValue(undefined)
    }
}

export function makeMemoryRepositoryMock(entries: Array<MemoryEntry> = []): MemoryRepositoryInterface {
    const store = new Map<string, MemoryEntry>(entries.map(entry => [entry.id, entry]))
    let nextId = entries.length

    return {
        create: jest.fn(async (partition: MemoryPartition, content: string, pinned: boolean) => {
            nextId++
            const now = Date.now()
            const entry: MemoryEntry = {
                id: `entry-${nextId}`,
                scope: partition.scope,
                content,
                pinned,
                createdAt: now,
                updatedAt: now
            }
            store.set(entry.id, entry)
            return entry
        }),
        findById: jest.fn(async (_partition: MemoryPartition, id: string) => store.get(id) ?? null),
        findAll: jest.fn(async () => [...store.values()]),
        update: jest.fn(async (_partition: MemoryPartition, id: string, patch: MemoryEntryPatch) => {
            const existing = store.get(id)
            if (existing === undefined) throw new Error(`Memory entry "${id}" not found`)
            const updated: MemoryEntry = { ...existing, ...patch, updatedAt: Date.now() }
            store.set(id, updated)
            return updated
        }),
        delete: jest.fn(async (_partition: MemoryPartition, id: string) => {
            if (!store.has(id)) throw new Error(`Memory entry "${id}" not found`)
            store.delete(id)
        }),
        search: jest.fn(async () => [...store.values()]),
        ensureInitialized: jest.fn().mockResolvedValue(undefined)
    }
}

export function makeAgentDependencies(overrides: Partial<AgentDependencies> = {}): AgentDependencies {
    return {
        toolOrchestrator: makeToolOrchestrator(),
        guardrails: [],
        guardrailResolver: makeGuardrailResolver(),
        observability: makeObservability(),
        structuredOutputExtractor: makeStructuredOutputExtractor(),
        memory: makeMemory(),
        budgetFactory: makeBudgetFactory(),
        ...overrides
    }
}

export function makeAgentConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
    return {
        id: 'test-agent',
        name: 'Test Agent',
        role: AGENT_ROLE.ASSISTANT,
        provider: makeProvider(),
        model: TEST_MODEL,
        systemPrompt: 'You are a test agent.',
        thinkingStrategy: new ReActStrategy(),
        ...overrides
    }
}

export function makeSession(id = 'session-1'): Session {
    return new Session(id)
}

export function makeSessionManager(sessions: Array<SessionInterface> = []): SessionManagerInterface {
    const map = new Map(sessions.map(session => [session.id, session]))
    return {
        create: jest.fn((id: string) => {
            const session = new Session(id)
            map.set(id, session)
            return Promise.resolve(session)
        }),
        get: jest.fn((id: string) => Promise.resolve(map.get(id) ?? null)),
        save: jest.fn().mockResolvedValue(undefined),
        list: jest.fn(() => Promise.resolve([...map.values()])),
        delete: jest.fn((id: string) => {
            map.delete(id)
            return Promise.resolve()
        })
    }
}

export function makeTestAgent(provider?: TestProvider, deps?: Partial<AgentDependencies>): Agent {
    return new Agent(makeAgentConfig(provider !== undefined ? { provider } : {}), makeAgentDependencies(deps))
}

export function makeAgentInterface(overrides: Partial<AgentConfig> = {}): AgentInterface {
    const config = makeAgentConfig(overrides)
    return {
        config,
        update: jest.fn(),
        run: jest.fn().mockReturnValue((async function* () {})()),
        stop: jest.fn().mockResolvedValue(undefined)
    }
}

export function makeAgentRegistry(agents: Array<AgentInterface> = []): AgentRegistryInterface {
    const map = new Map(agents.map(a => [a.config.id, a]))
    return {
        get: jest.fn((id: string) => map.get(id) ?? null),
        has: jest.fn((id: string) => map.has(id)),
        register: jest.fn((id: string, agent: AgentInterface) => {
            map.set(id, agent)
        }),
        unregister: jest.fn((id: string) => {
            map.delete(id)
        }),
        list: jest.fn(() => [...map.values()])
    }
}

export function makeRawAgentConfig(id: string, overrides: Partial<RawAgentConfig> = {}): RawAgentConfig {
    return {
        id,
        name: id,
        role: 'assistant' as RawAgentConfig['role'],
        provider: 'test',
        model: 'test-model',
        systemPrompt: 'You are helpful.',
        thinkingStrategy: 'react',
        ...overrides
    }
}

export function makeRawAgentConfigRepository(): RawAgentConfigRepositoryInterface {
    return {
        findAll: jest.fn().mockResolvedValue([]),
        findById: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((config: RawAgentConfig) => Promise.resolve(config)),
        update: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
        ensureInitialized: jest.fn().mockResolvedValue(undefined)
    }
}

export function makeProviderRegistry(
    provider: ProviderInterface = makeProvider(),
    found = true
): ProviderRegistryInterface {
    return {
        get: jest.fn().mockReturnValue(found ? provider : null),
        has: jest.fn().mockReturnValue(found),
        register: jest.fn(),
        unregister: jest.fn(),
        list: jest.fn().mockReturnValue(found ? [provider] : [])
    }
}

export function makeThinkingStrategyRegistry(
    strategy = new ReActStrategy(),
    found = true
): ThinkingStrategyRegistryInterface {
    return {
        get: jest.fn().mockReturnValue(found ? strategy : null),
        has: jest.fn().mockReturnValue(found),
        register: jest.fn(),
        unregister: jest.fn(),
        list: jest.fn().mockReturnValue(found ? [strategy] : [])
    }
}

export function makeToolRegistryMock(): ToolRegistryInterface {
    return {
        get: jest.fn().mockReturnValue(null),
        has: jest.fn().mockReturnValue(false),
        register: jest.fn(),
        unregister: jest.fn(),
        list: jest.fn().mockReturnValue([])
    }
}

export function makeSkillRegistryMock(skills: Array<Skill> = []): SkillRegistryInterface {
    const map = new Map(skills.map(skill => [skill.name, skill]))
    return {
        get: jest.fn((name: string) => map.get(name) ?? null),
        has: jest.fn((name: string) => map.has(name)),
        register: jest.fn((name: string, skill: Skill) => {
            map.set(name, skill)
        }),
        unregister: jest.fn((name: string) => {
            map.delete(name)
        }),
        list: jest.fn(() => [...map.values()])
    }
}

export function makeSkillRepository(skills: Array<Skill> = []): SkillRepositoryInterface {
    const map = new Map(skills.map(skill => [skill.name, skill]))
    const resources = new Map<string, Buffer>()

    return {
        findAll: jest.fn(() => Promise.resolve([...map.values()])),
        findById: jest.fn((name: string) => Promise.resolve(map.get(name) ?? null)),
        create: jest.fn((skill: Skill) => {
            map.set(skill.name, skill)
            return Promise.resolve(skill)
        }),
        update: jest.fn((name: string, patch: Partial<Skill>) => {
            const existing = map.get(name)
            if (existing === undefined) return Promise.reject(new Error(`Skill "${name}" not found`))
            const updated = { ...existing, ...patch }
            map.set(name, updated)
            return Promise.resolve(updated)
        }),
        delete: jest.fn((name: string) => {
            map.delete(name)
            return Promise.resolve()
        }),
        writeResource: jest.fn((skillName: string, relativePath: string, content: Buffer) => {
            resources.set(`${skillName}:${relativePath}`, content)
            return Promise.resolve()
        }),
        readResource: jest.fn((skillName: string, relativePath: string) => {
            const content = resources.get(`${skillName}:${relativePath}`)
            if (content === undefined) return Promise.reject(new Error(`Resource "${relativePath}" not found`))
            return Promise.resolve(content)
        }),
        deleteResource: jest.fn((skillName: string, relativePath: string) => {
            const key = `${skillName}:${relativePath}`
            if (!resources.has(key)) return Promise.reject(new Error(`Resource "${relativePath}" not found`))
            resources.delete(key)
            return Promise.resolve()
        }),
        resolveExecutablePath: jest.fn((skillName: string, relativePath: string) => {
            const key = `${skillName}:${relativePath}`
            if (!resources.has(key)) return Promise.reject(new Error(`Resource "${relativePath}" not found`))
            return Promise.resolve(`/skills/${skillName}/${relativePath}`)
        }),
        ensureInitialized: jest.fn().mockResolvedValue(undefined)
    }
}

export function makeMCPServerRegistryMock(clients: Array<MCPClientInterface> = []): MCPServerRegistryInterface {
    const map = new Map(clients.map(client => [client.alias, client]))
    return {
        get: jest.fn((alias: string) => map.get(alias) ?? null),
        has: jest.fn((alias: string) => map.has(alias)),
        register: jest.fn((alias: string, client: MCPClientInterface) => {
            map.set(alias, client)
        }),
        unregister: jest.fn((alias: string) => {
            map.delete(alias)
        }),
        list: jest.fn(() => [...map.values()])
    }
}

export function makeWorkFlowRegistryMock(): WorkFlowRegistryInterface {
    return {
        get: jest.fn().mockReturnValue(null),
        has: jest.fn().mockReturnValue(false),
        register: jest.fn(),
        unregister: jest.fn(),
        list: jest.fn().mockReturnValue([])
    }
}

export function makeAgentConfigRegistryDeps(
    overrides: Partial<AgentConfigRegistryDependencies> = {}
): AgentConfigRegistryDependencies {
    return {
        providerRegistry: makeProviderRegistry(),
        thinkingStrategyRegistry: makeThinkingStrategyRegistry(),
        toolRegistry: makeToolRegistryMock(),
        skillRegistry: makeSkillRegistryMock(),
        agentRegistry: makeAgentRegistry(),
        mcpServerRegistry: makeMCPServerRegistryMock(),
        workflowRegistry: makeWorkFlowRegistryMock(),
        ...overrides
    }
}

export function makeToolMock(name = 'test_tool'): ToolInterface {
    return {
        name,
        description: '',
        parameters: {},
        execute: jest.fn().mockResolvedValue('ok')
    }
}

export function makeSkillMock(overrides: Partial<Skill> = {}): Skill {
    const name = overrides.name ?? 'test_skill'
    return {
        name,
        description: '',
        content: '',
        directory: `/skills/${name}`,
        resources: [],
        ...overrides
    }
}
