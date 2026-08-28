import { hydrateAgentConfig } from '@agent/utils/hydrateAgentConfig'
import { AgentConfigRegistryDependencies } from '@agent/types/AgentConfigRegistryDependencies'
import { RawAgentConfig } from '@agent/types/RawAgentConfig'
import { AGENT_ROLE } from '@agent/types/AgentRole'
import { ToolRegistryInterface } from '@tool/interfaces'
import { SkillRegistryInterface } from '@skill'
import { AgentRegistryInterface } from '@agent/interfaces'
import { MCPServerRegistryInterface } from '@mcp'
import { WorkFlowRegistryInterface } from '@workflow'
import { LoggerInterface } from '@logger'
import { makeProvider } from '../../../../helpers/TestProvider'
import {
    makeAgentInterface,
    makeAgentConfigRegistryDeps,
    makeProviderRegistry,
    makeThinkingStrategyRegistry,
    makeToolMock,
    makeSkillMock
} from '../../../../helpers/makeAgent'
import { makeLoggerMock } from '../../../../helpers/makeLogger'
import { ReActStrategy } from '@strategy'

const testProvider = makeProvider()
const testStrategy = new ReActStrategy()

const BASE_RAW: RawAgentConfig = {
    id: 'agent-1',
    name: 'Test',
    role: AGENT_ROLE.ASSISTANT,
    provider: 'test',
    model: 'test-model',
    systemPrompt: 'Hello',
    thinkingStrategy: 'ReAct'
}

function makeDeps(overrides: Partial<AgentConfigRegistryDependencies> = {}): AgentConfigRegistryDependencies {
    return makeAgentConfigRegistryDeps({
        providerRegistry: makeProviderRegistry(testProvider),
        thinkingStrategyRegistry: makeThinkingStrategyRegistry(testStrategy),
        ...overrides
    })
}

describe('hydrateAgentConfig', () => {
    let logger: LoggerInterface

    beforeEach(() => {
        logger = makeLoggerMock()
    })

    it('returns null when provider is not found', () => {
        const result = hydrateAgentConfig(
            BASE_RAW,
            makeDeps({ providerRegistry: makeProviderRegistry(testProvider, false) }),
            logger
        )
        expect(result).toBeNull()
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"test"'), expect.anything())
    })

    it('returns null when thinking strategy is not found', () => {
        const result = hydrateAgentConfig(
            BASE_RAW,
            makeDeps({ thinkingStrategyRegistry: makeThinkingStrategyRegistry(testStrategy, false) }),
            logger
        )
        expect(result).toBeNull()
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"ReAct"'), expect.anything())
    })

    it('returns AgentConfig with required fields', () => {
        const result = hydrateAgentConfig(BASE_RAW, makeDeps(), logger)
        expect(result).not.toBeNull()
        if (!result) throw new Error()
        expect(result.id).toBe('agent-1')
        expect(result.name).toBe('Test')
        expect(result.role).toBe(AGENT_ROLE.ASSISTANT)
        expect(result.provider).toBe(testProvider)
        expect(result.model).toBe('test-model')
        expect(result.systemPrompt).toBe('Hello')
        expect(result.thinkingStrategy).toBe(testStrategy)
    })

    it('omits tools when rawConfig has no tools', () => {
        const result = hydrateAgentConfig(BASE_RAW, makeDeps(), logger)
        if (!result) throw new Error()
        expect(result.tools).toBeUndefined()
    })

    it('resolves tools from tool registry by name pattern', () => {
        const search = makeToolMock('search')
        const toolRegistry: ToolRegistryInterface = {
            get: jest.fn().mockReturnValue(null),
            has: jest.fn().mockReturnValue(false),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([search])
        }
        const raw: RawAgentConfig = { ...BASE_RAW, tools: ['search'] }
        const result = hydrateAgentConfig(raw, makeDeps({ toolRegistry }), logger)
        if (!result) throw new Error()
        expect(result.tools).toHaveLength(1)
        expect(result.tools?.[0]?.name).toBe('search')
    })

    it('omits tools when patterns match nothing', () => {
        const toolRegistry: ToolRegistryInterface = {
            get: jest.fn().mockReturnValue(null),
            has: jest.fn().mockReturnValue(false),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([makeToolMock('calc')])
        }
        const raw: RawAgentConfig = { ...BASE_RAW, tools: ['search'] }
        const result = hydrateAgentConfig(raw, makeDeps({ toolRegistry }), logger)
        if (!result) throw new Error()
        expect(result.tools).toBeUndefined()
    })

    it('resolves skills from skill registry', () => {
        const skill = makeSkillMock({ name: 'code-review' })
        const skillRegistry: SkillRegistryInterface = {
            get: jest.fn().mockReturnValue(null),
            has: jest.fn().mockReturnValue(false),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([skill])
        }
        const raw: RawAgentConfig = { ...BASE_RAW, skills: ['code-review'] }
        const result = hydrateAgentConfig(raw, makeDeps({ skillRegistry }), logger)
        if (!result) throw new Error()
        expect(result.skills).toHaveLength(1)
        expect(result.skills?.[0]?.name).toBe('code-review')
    })

    it('includes optional description when provided', () => {
        const raw: RawAgentConfig = { ...BASE_RAW, description: 'A helpful agent' }
        const result = hydrateAgentConfig(raw, makeDeps(), logger)
        if (!result) throw new Error()
        expect(result.description).toBe('A helpful agent')
    })

    it('includes budget when provided', () => {
        const raw: RawAgentConfig = { ...BASE_RAW, budget: { maxIterations: 5 } }
        const result = hydrateAgentConfig(raw, makeDeps(), logger)
        if (!result) throw new Error()
        expect(result.budget).toEqual({ maxIterations: 5 })
    })

    it('includes temperature when provided', () => {
        const raw: RawAgentConfig = { ...BASE_RAW, temperature: 0.5 }
        const result = hydrateAgentConfig(raw, makeDeps(), logger)
        if (!result) throw new Error()
        expect(result.temperature).toBe(0.5)
    })

    it('resolves agents from agent registry', () => {
        const subAgent = makeAgentInterface({ id: 'sub-1' })
        const agentRegistry: AgentRegistryInterface = {
            get: jest.fn().mockReturnValue(null),
            has: jest.fn().mockReturnValue(false),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([subAgent])
        }
        const raw: RawAgentConfig = { ...BASE_RAW, agents: ['sub-1'] }
        const result = hydrateAgentConfig(raw, makeDeps({ agentRegistry }), logger)
        if (!result) throw new Error()
        expect(result.agents).toHaveLength(1)
        expect(result.agents?.[0]?.config.id).toBe('sub-1')
    })

    it('resolves mcpServers from mcp server registry', () => {
        const mockAlias = 'my-mcp'
        const mockServer = {
            alias: mockAlias,
            connect: jest.fn(),
            disconnect: jest.fn(),
            onConnect: jest.fn(),
            onDisconnect: jest.fn(),
            getStatus: jest.fn(),
            getCapabilities: jest.fn().mockReturnValue(null),
            getConfig: jest.fn(),
            getServerInfo: jest.fn(),
            listTools: jest.fn().mockResolvedValue([]),
            callTool: jest.fn(),
            listResources: jest.fn().mockResolvedValue([]),
            readResource: jest.fn(),
            listPrompts: jest.fn().mockResolvedValue([]),
            getPrompt: jest.fn()
        }
        const mcpServerRegistry: MCPServerRegistryInterface = {
            get: jest.fn().mockReturnValue(null),
            has: jest.fn().mockReturnValue(false),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([mockServer])
        }
        const raw: RawAgentConfig = { ...BASE_RAW, mcpServers: ['my-mcp'] }
        const result = hydrateAgentConfig(raw, makeDeps({ mcpServerRegistry }), logger)
        if (!result) throw new Error()
        expect(result.mcpServers).toHaveLength(1)
        expect(result.mcpServers?.[0]?.alias).toBe('my-mcp')
    })

    it('resolves workflows from workflow registry', () => {
        const workflow = {
            id: 'wf-1',
            name: 'Workflow 1',
            validate: jest.fn(),
            getEntries: jest.fn().mockReturnValue([]),
            getConnections: jest.fn().mockReturnValue([]),
            findEntryById: jest.fn().mockReturnValue(null),
            findStartEntries: jest.fn().mockReturnValue([]),
            findFinalEntries: jest.fn().mockReturnValue([]),
            addNode: jest.fn(),
            removeNode: jest.fn(),
            addConnection: jest.fn(),
            removeConnection: jest.fn(),
            setPortMapping: jest.fn(),
            setConfigOverride: jest.fn()
        }
        const workflowRegistry: WorkFlowRegistryInterface = {
            get: jest.fn().mockReturnValue(null),
            has: jest.fn().mockReturnValue(false),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([workflow])
        }
        const raw: RawAgentConfig = { ...BASE_RAW, workflows: ['wf-1'] }
        const result = hydrateAgentConfig(raw, makeDeps({ workflowRegistry }), logger)
        if (!result) throw new Error()
        expect(result.workflows).toHaveLength(1)
        expect(result.workflows?.[0]?.id).toBe('wf-1')
    })

    it('includes guardrailRules when provided', () => {
        const raw: RawAgentConfig = { ...BASE_RAW, guardrailRules: { shell_command: { git: 'approve_always' } } }
        const result = hydrateAgentConfig(raw, makeDeps(), logger)
        if (!result) throw new Error()
        expect(result.guardrailRules).toEqual({ shell_command: { git: 'approve_always' } })
    })

    it('omits guardrailRules when not provided', () => {
        const result = hydrateAgentConfig(BASE_RAW, makeDeps(), logger)
        if (!result) throw new Error()
        expect(result.guardrailRules).toBeUndefined()
    })

    it('omits timezone when neither the agent nor a default is set', () => {
        const result = hydrateAgentConfig(BASE_RAW, makeDeps(), logger)
        if (!result) throw new Error()
        expect(result.timezone).toBeUndefined()
    })

    it('falls back to the default timezone when the agent has none', () => {
        const result = hydrateAgentConfig(BASE_RAW, makeDeps(), logger, 'Europe/Moscow')
        if (!result) throw new Error()
        expect(result.timezone).toBe('Europe/Moscow')
    })

    it('prefers the agent-specific timezone over the default', () => {
        const raw: RawAgentConfig = { ...BASE_RAW, timezone: 'Asia/Tokyo' }
        const result = hydrateAgentConfig(raw, makeDeps(), logger, 'Europe/Moscow')
        if (!result) throw new Error()
        expect(result.timezone).toBe('Asia/Tokyo')
    })

    it('resolves tools with wildcard pattern', () => {
        const tools = [makeToolMock('search'), makeToolMock('calc'), makeToolMock('weather')]
        const toolRegistry: ToolRegistryInterface = {
            get: jest.fn().mockReturnValue(null),
            has: jest.fn().mockReturnValue(false),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue(tools)
        }
        const raw: RawAgentConfig = { ...BASE_RAW, tools: ['*'] }
        const result = hydrateAgentConfig(raw, makeDeps({ toolRegistry }), logger)
        if (!result) throw new Error()
        expect(result.tools).toHaveLength(3)
    })
})
