import { dehydrateAgentConfig } from '@agent/utils/dehydrateAgentConfig'
import { AGENT_ROLE } from '@agent/types/AgentRole'
import { AgentInterface } from '@agent/interfaces/AgentInterface'
import { WorkFlowInterface } from '@workflow'
import { makeAgentConfig, makeToolMock, makeSkillMock } from '../../../../helpers/makeAgent'

function makeSubAgentMock(id: string): AgentInterface {
    return {
        config: makeAgentConfig({ id }),
        update: jest.fn(),
        run: jest.fn().mockReturnValue((async function* () {})()),
        stop: jest.fn().mockResolvedValue(undefined)
    }
}

describe('dehydrateAgentConfig', () => {
    it('converts required fields', () => {
        const config = makeAgentConfig()
        const raw = dehydrateAgentConfig(config)
        expect(raw.id).toBe(config.id)
        expect(raw.name).toBe(config.name)
        expect(raw.role).toBe(config.role)
        expect(raw.provider).toBe(config.provider.name)
        expect(raw.model).toBe(config.model)
        expect(raw.systemPrompt).toBe(config.systemPrompt)
        expect(raw.thinkingStrategy).toBe(config.thinkingStrategy.name)
    })

    it('omits tools when undefined', () => {
        const raw = dehydrateAgentConfig(makeAgentConfig())
        expect(raw.tools).toBeUndefined()
    })

    it('omits empty tools array', () => {
        const raw = dehydrateAgentConfig(makeAgentConfig({ tools: [] }))
        expect(raw.tools).toBeUndefined()
    })

    it('maps tools to names', () => {
        const config = makeAgentConfig({ tools: [makeToolMock('search'), makeToolMock('calc')] })
        const raw = dehydrateAgentConfig(config)
        expect(raw.tools).toEqual(['search', 'calc'])
    })

    it('omits skills when undefined', () => {
        const raw = dehydrateAgentConfig(makeAgentConfig())
        expect(raw.skills).toBeUndefined()
    })

    it('maps skills to names', () => {
        const config = makeAgentConfig({
            skills: [makeSkillMock({ name: 'code-review' }), makeSkillMock({ name: 'testing' })]
        })
        const raw = dehydrateAgentConfig(config)
        expect(raw.skills).toEqual(['code-review', 'testing'])
    })

    it('omits agents when undefined', () => {
        const raw = dehydrateAgentConfig(makeAgentConfig())
        expect(raw.agents).toBeUndefined()
    })

    it('maps agents to their config ids', () => {
        const config = makeAgentConfig({ agents: [makeSubAgentMock('sub-a'), makeSubAgentMock('sub-b')] })
        const raw = dehydrateAgentConfig(config)
        expect(raw.agents).toEqual(['sub-a', 'sub-b'])
    })

    it('omits mcpServers when undefined', () => {
        const raw = dehydrateAgentConfig(makeAgentConfig())
        expect(raw.mcpServers).toBeUndefined()
    })

    it('maps mcpServers to aliases', () => {
        const server1 = {
            alias: 'mcp-a',
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
        const server2 = { ...server1, alias: 'mcp-b' }
        const config = makeAgentConfig({ mcpServers: [server1, server2] })
        const raw = dehydrateAgentConfig(config)
        expect(raw.mcpServers).toEqual(['mcp-a', 'mcp-b'])
    })

    it('omits description when undefined', () => {
        const raw = dehydrateAgentConfig(makeAgentConfig())
        expect(raw.description).toBeUndefined()
    })

    it('includes description when provided', () => {
        const config = makeAgentConfig({ description: 'A helpful agent' })
        const raw = dehydrateAgentConfig(config)
        expect(raw.description).toBe('A helpful agent')
    })

    it('omits budget when undefined', () => {
        const raw = dehydrateAgentConfig(makeAgentConfig())
        expect(raw.budget).toBeUndefined()
    })

    it('includes budget when provided', () => {
        const config = makeAgentConfig({ budget: { maxIterations: 10 } })
        const raw = dehydrateAgentConfig(config)
        expect(raw.budget).toEqual({ maxIterations: 10 })
    })

    it('omits temperature when undefined', () => {
        const raw = dehydrateAgentConfig(makeAgentConfig())
        expect(raw.temperature).toBeUndefined()
    })

    it('includes temperature when provided', () => {
        const config = makeAgentConfig({ temperature: 0.7 })
        const raw = dehydrateAgentConfig(config)
        expect(raw.temperature).toBe(0.7)
    })

    it('omits workflows when undefined', () => {
        const raw = dehydrateAgentConfig(makeAgentConfig())
        expect(raw.workflows).toBeUndefined()
    })

    it('maps workflows to their ids', () => {
        const wf1: WorkFlowInterface = {
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
        const wf2: WorkFlowInterface = { ...wf1, id: 'wf-2', name: 'Workflow 2' }
        const config = makeAgentConfig({ workflows: [wf1, wf2] })
        const raw = dehydrateAgentConfig(config)
        expect(raw.workflows).toEqual(['wf-1', 'wf-2'])
    })

    it('omits guardrailRules when undefined', () => {
        const raw = dehydrateAgentConfig(makeAgentConfig())
        expect(raw.guardrailRules).toBeUndefined()
    })

    it('includes guardrailRules when provided', () => {
        const config = makeAgentConfig({ guardrailRules: { shell_command: { git: 'approve_always' } } })
        const raw = dehydrateAgentConfig(config)
        expect(raw.guardrailRules).toEqual({ shell_command: { git: 'approve_always' } })
    })

    it('omits timezone when undefined', () => {
        const raw = dehydrateAgentConfig(makeAgentConfig())
        expect(raw.timezone).toBeUndefined()
    })

    it('includes timezone when provided', () => {
        const config = makeAgentConfig({ timezone: 'Europe/Moscow' })
        const raw = dehydrateAgentConfig(config)
        expect(raw.timezone).toBe('Europe/Moscow')
    })

    it('roundtrips role correctly', () => {
        const config = makeAgentConfig({ role: AGENT_ROLE.ORCHESTRATOR })
        const raw = dehydrateAgentConfig(config)
        expect(raw.role).toBe(AGENT_ROLE.ORCHESTRATOR)
    })
})
