import { UpdateAgentTool } from '@tool/implementations/agent/UpdateAgentTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { AGENT_ROLE } from '@agent/types/AgentRole'
import { ProviderRegistryInterface } from '@provider'
import { ThinkingStrategyRegistryInterface } from '@strategy'
import { ToolRegistryInterface } from '@tool/interfaces'
import { SkillRegistryInterface } from '@skill'
import { MCPServerRegistryInterface } from '@mcp'
import { RawAgentFactory } from '@agent/types/RawAgentFactory'
import { UpdateAgentToolDependencies } from '@tool/implementations/agent/types'
import {
    makeAgentInterface,
    makeAgentRegistry,
    makeRawAgentConfigRepository,
    makeProviderRegistry,
    makeThinkingStrategyRegistry,
    makeToolRegistryMock,
    makeSkillRegistryMock,
    makeMCPServerRegistryMock,
    makeWorkFlowRegistryMock,
    makeToolMock
} from '../../../../../helpers/makeAgent'
import { makeProvider } from '../../../../../helpers/TestProvider'
import { makeSimpleRegistry } from '../../../../../helpers/makeRegistry'
import { ReActStrategy } from '@strategy'
import { MCPClientInterface } from '@mcp'
import { GUARDRAIL_RULE_DECISION, GuardrailInterface } from '@guardrail'
import { WorkFlowInterface, WorkFlowRegistryInterface } from '@workflow'

const testProvider = makeProvider()
const testStrategy = new ReActStrategy()

function makeMCPMock(alias: string): MCPClientInterface {
    return {
        alias,
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
}

function makeDeps(overrides: Partial<UpdateAgentToolDependencies> = {}): UpdateAgentToolDependencies {
    return {
        rawAgentFactory: jest.fn() as RawAgentFactory,
        agentRegistry: makeAgentRegistry(),
        providerRegistry: makeProviderRegistry(testProvider),
        thinkingStrategyRegistry: makeThinkingStrategyRegistry(testStrategy),
        toolRegistry: makeToolRegistryMock(),
        skillRegistry: makeSkillRegistryMock(),
        mcpServerRegistry: makeMCPServerRegistryMock(),
        workflowRegistry: makeWorkFlowRegistryMock(),
        guardrailRegistry: makeSimpleRegistry<GuardrailInterface>(),
        ...overrides
    }
}

describe('UpdateAgentTool', () => {
    it('has correct name', () => {
        const tool = new UpdateAgentTool(makeDeps())
        expect(tool.name).toBe('agent_update')
    })

    it('throws AgentToolError when agent is not found', async () => {
        const tool = new UpdateAgentTool(makeDeps())
        await expect(tool.execute({ agentId: 'ghost' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('updates the agent name', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', name: 'New Name' }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name' }))
    })

    it('updates the agent role', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', role: AGENT_ROLE.ORCHESTRATOR }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ role: AGENT_ROLE.ORCHESTRATOR }))
    })

    it('updates the system prompt', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', systemPrompt: 'New prompt' }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ systemPrompt: 'New prompt' }))
    })

    it('updates the temperature', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', temperature: 0.9 }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ temperature: 0.9 }))
    })

    it('updates the timezone', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', timezone: 'Europe/Moscow' }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ timezone: 'Europe/Moscow' }))
    })

    it('passes the raw timezone patch to the repository when provided', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const repo = makeRawAgentConfigRepository()
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]), rawAgentConfigRepository: repo })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', timezone: 'Europe/Moscow' }, 'caller', 'session-1')
        expect(repo.update).toHaveBeenCalledWith('a1', expect.objectContaining({ timezone: 'Europe/Moscow' }))
    })

    it('throws AgentToolError for an invalid IANA timezone', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await expect(tool.execute({ agentId: 'a1', timezone: 'Not/A_Zone' }, 'caller', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError when provider is not found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({
            agentRegistry: makeAgentRegistry([agent]),
            providerRegistry: makeProviderRegistry(testProvider, false)
        })
        const tool = new UpdateAgentTool(deps)
        await expect(tool.execute({ agentId: 'a1', provider: 'nonexistent' }, 'caller', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('updates the provider when found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const newProvider = makeProvider()
        const providerRegistry: ProviderRegistryInterface = {
            get: jest.fn().mockReturnValue(newProvider),
            has: jest.fn().mockReturnValue(true),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([newProvider])
        }
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]), providerRegistry })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', provider: 'new-provider' }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ provider: newProvider }))
    })

    it('throws AgentToolError when thinking strategy is not found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({
            agentRegistry: makeAgentRegistry([agent]),
            thinkingStrategyRegistry: makeThinkingStrategyRegistry(testStrategy, false)
        })
        const tool = new UpdateAgentTool(deps)
        await expect(tool.execute({ agentId: 'a1', thinkingStrategy: 'ghost' }, 'caller', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError when a tool is not found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await expect(tool.execute({ agentId: 'a1', addTools: ['ghost-tool'] }, 'caller', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('updates tools when all are found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const search = makeToolMock('search')
        const toolRegistry: ToolRegistryInterface = {
            get: jest.fn().mockReturnValue(search),
            has: jest.fn().mockReturnValue(true),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([search])
        }
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]), toolRegistry })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', addTools: ['search'] }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ tools: [search] }))
    })

    it('removes a previously granted pattern via removeTools without adding any new pattern', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const search = makeToolMock('search')
        const toolRegistry: ToolRegistryInterface = {
            get: jest.fn().mockReturnValue(search),
            has: jest.fn().mockReturnValue(true),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([search])
        }
        const repo = makeRawAgentConfigRepository()
        ;(repo.findById as jest.Mock).mockResolvedValue({
            id: 'a1',
            name: 'Agent',
            role: AGENT_ROLE.ASSISTANT,
            provider: 'test',
            model: 'test',
            systemPrompt: '',
            thinkingStrategy: 'react',
            tools: ['search']
        })
        const deps = makeDeps({
            agentRegistry: makeAgentRegistry([agent]),
            toolRegistry,
            rawAgentConfigRepository: repo
        })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', removeTools: ['search'] }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ tools: [] }))
        expect(repo.update).toHaveBeenCalledWith('a1', expect.objectContaining({ tools: [] }))
    })

    it('resolves tools using a glob pattern, same as agent_create', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const search = makeToolMock('fs_search')
        const write = makeToolMock('fs_write')
        const toolRegistry: ToolRegistryInterface = {
            get: jest.fn().mockReturnValue(null),
            has: jest.fn().mockReturnValue(true),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([search, write])
        }
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]), toolRegistry })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', addTools: ['fs_*'] }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ tools: [search, write] }))
    })

    it('does not duplicate a pattern already present in the existing raw config patterns', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const search = makeToolMock('search')
        const toolRegistry: ToolRegistryInterface = {
            get: jest.fn().mockReturnValue(search),
            has: jest.fn().mockReturnValue(true),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([search])
        }
        const repo = makeRawAgentConfigRepository()
        ;(repo.findById as jest.Mock).mockResolvedValue({
            id: 'a1',
            name: 'Agent',
            role: AGENT_ROLE.ASSISTANT,
            provider: 'test',
            model: 'test',
            systemPrompt: '',
            thinkingStrategy: 'react',
            tools: ['search']
        })
        const deps = makeDeps({
            agentRegistry: makeAgentRegistry([agent]),
            toolRegistry,
            rawAgentConfigRepository: repo
        })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', addTools: ['search'] }, 'caller', 'session-1')
        expect(repo.update).toHaveBeenCalledWith('a1', expect.objectContaining({ tools: ['search'] }))
    })

    it('throws AgentToolError when a skill is not found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await expect(
            tool.execute({ agentId: 'a1', addSkills: ['ghost-skill'] }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when a sub-agent is not found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await expect(tool.execute({ agentId: 'a1', addAgents: ['ghost-sub'] }, 'caller', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError when MCP server is not found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await expect(
            tool.execute({ agentId: 'a1', addMcpServers: ['ghost-mcp'] }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('updates MCP servers when found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const mcp = makeMCPMock('my-mcp')
        const mcpServerRegistry: MCPServerRegistryInterface = {
            get: jest.fn().mockReturnValue(mcp),
            has: jest.fn().mockReturnValue(true),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([mcp])
        }
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]), mcpServerRegistry })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', addMcpServers: ['my-mcp'] }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ mcpServers: [mcp] }))
    })

    it('throws AgentToolError when a workflow is not found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await expect(
            tool.execute({ agentId: 'a1', addWorkflows: ['ghost-workflow'] }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('updates workflows when found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const workflow = { id: 'my-workflow' } as WorkFlowInterface
        const workflowRegistry: WorkFlowRegistryInterface = {
            get: jest.fn().mockReturnValue(workflow),
            has: jest.fn().mockReturnValue(true),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([workflow])
        }
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]), workflowRegistry })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', addWorkflows: ['my-workflow'] }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ workflows: [workflow] }))
    })

    it('calls repository.update when repository is provided', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const repo = makeRawAgentConfigRepository()
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]), rawAgentConfigRepository: repo })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', name: 'Updated' }, 'caller', 'session-1')
        expect(repo.update).toHaveBeenCalledWith('a1', expect.anything())
    })

    it('does not call repository when repository is not provided', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const repo = makeRawAgentConfigRepository()
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', name: 'Updated' }, 'caller', 'session-1')
        expect(repo.update).not.toHaveBeenCalled()
    })

    it('updates the description', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', description: 'New desc' }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ description: 'New desc' }))
    })

    it('updates the model', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', model: 'gpt-4o' }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o' }))
    })

    it('updates thinking strategy when found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const newStrategy = { name: 'new-strategy', systemPrompt: '', execute: jest.fn() }
        const thinkingStrategyRegistry: ThinkingStrategyRegistryInterface = {
            get: jest.fn().mockReturnValue(newStrategy),
            has: jest.fn().mockReturnValue(true),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([newStrategy])
        }
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]), thinkingStrategyRegistry })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', thinkingStrategy: 'new-strategy' }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ thinkingStrategy: newStrategy }))
    })

    it('updates skills when all are found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const skill = { name: 'my-skill', description: '', content: '', directory: '/skills', resources: [] }
        const skillRegistry: SkillRegistryInterface = {
            get: jest.fn().mockReturnValue(skill),
            has: jest.fn().mockReturnValue(true),
            register: jest.fn(),
            unregister: jest.fn(),
            list: jest.fn().mockReturnValue([skill])
        }
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]), skillRegistry })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', addSkills: ['my-skill'] }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ skills: [skill] }))
    })

    it('updates sub-agents when all are found', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const sub = makeAgentInterface({ id: 'sub-1' })
        const agentRegistry = makeAgentRegistry([agent, sub])
        const deps = makeDeps({ agentRegistry })
        const tool = new UpdateAgentTool(deps)
        await tool.execute({ agentId: 'a1', addAgents: ['sub-1'] }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ agents: [sub] }))
    })

    it('returns an AgentSummary', async () => {
        const agent = makeAgentInterface({ id: 'a1', name: 'Original' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        const result = (await tool.execute({ agentId: 'a1' }, 'caller', 'session-1')) as { id: string }
        expect(result.id).toBe('a1')
    })

    it('updates the budget with all fields', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
        const tool = new UpdateAgentTool(deps)
        const budget = { maxTokens: 500, maxIterations: 3, maxToolCalls: 10, maxCostUsd: 0.5, maxDurationMs: 60000 }
        await tool.execute({ agentId: 'a1', budget }, 'caller', 'session-1')
        expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ budget }))
    })

    it('passes the raw budget patch to the repository when provided', async () => {
        const agent = makeAgentInterface({ id: 'a1' })
        const repo = makeRawAgentConfigRepository()
        const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]), rawAgentConfigRepository: repo })
        const tool = new UpdateAgentTool(deps)
        const budget = { maxTokens: 500 }
        await tool.execute({ agentId: 'a1', budget }, 'caller', 'session-1')
        expect(repo.update).toHaveBeenCalledWith('a1', expect.objectContaining({ budget }))
    })

    describe('guardrail rules', () => {
        it('throws AgentToolError when setGuardrailRules references an unknown guardrail', async () => {
            const agent = makeAgentInterface({ id: 'a1' })
            const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
            const tool = new UpdateAgentTool(deps)
            await expect(
                tool.execute(
                    {
                        agentId: 'a1',
                        setGuardrailRules: [
                            { guardrailId: 'ghost', ruleKey: 'fs_write', decision: GUARDRAIL_RULE_DECISION.DENY_ALWAYS }
                        ]
                    },
                    'caller',
                    'session-1'
                )
            ).rejects.toThrow(AgentToolError)
        })

        it('sets new guardrail rules on the agent', async () => {
            const agent = makeAgentInterface({ id: 'a1' })
            const guardrailRegistry = makeSimpleRegistry<GuardrailInterface>({
                tool_permission: {} as GuardrailInterface
            })
            const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]), guardrailRegistry })
            const tool = new UpdateAgentTool(deps)
            await tool.execute(
                {
                    agentId: 'a1',
                    setGuardrailRules: [
                        {
                            guardrailId: 'tool_permission',
                            ruleKey: 'fs_write',
                            decision: GUARDRAIL_RULE_DECISION.DENY_ALWAYS
                        }
                    ]
                },
                'caller',
                'session-1'
            )
            expect(agent.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    guardrailRules: { tool_permission: { fs_write: GUARDRAIL_RULE_DECISION.DENY_ALWAYS } }
                })
            )
        })

        it('merges new rules into the existing guardrailRules loaded from the repository', async () => {
            const agent = makeAgentInterface({ id: 'a1' })
            const repo = makeRawAgentConfigRepository()
            ;(repo.findById as jest.Mock).mockResolvedValue({
                id: 'a1',
                name: 'Agent',
                role: AGENT_ROLE.ASSISTANT,
                provider: 'test',
                model: 'test',
                systemPrompt: '',
                thinkingStrategy: 'react',
                guardrailRules: { tool_permission: { fs_read: GUARDRAIL_RULE_DECISION.APPROVE_ALWAYS } }
            })
            const guardrailRegistry = makeSimpleRegistry<GuardrailInterface>({
                tool_permission: {} as GuardrailInterface
            })
            const deps = makeDeps({
                agentRegistry: makeAgentRegistry([agent]),
                rawAgentConfigRepository: repo,
                guardrailRegistry
            })
            const tool = new UpdateAgentTool(deps)
            await tool.execute(
                {
                    agentId: 'a1',
                    setGuardrailRules: [
                        {
                            guardrailId: 'tool_permission',
                            ruleKey: 'fs_write',
                            decision: GUARDRAIL_RULE_DECISION.DENY_ALWAYS
                        }
                    ]
                },
                'caller',
                'session-1'
            )
            expect(agent.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    guardrailRules: {
                        tool_permission: {
                            fs_read: GUARDRAIL_RULE_DECISION.APPROVE_ALWAYS,
                            fs_write: GUARDRAIL_RULE_DECISION.DENY_ALWAYS
                        }
                    }
                })
            )
        })

        it('removes a guardrail rule, dropping the guardrailId entry once it becomes empty', async () => {
            const agent = makeAgentInterface({ id: 'a1' })
            const repo = makeRawAgentConfigRepository()
            ;(repo.findById as jest.Mock).mockResolvedValue({
                id: 'a1',
                name: 'Agent',
                role: AGENT_ROLE.ASSISTANT,
                provider: 'test',
                model: 'test',
                systemPrompt: '',
                thinkingStrategy: 'react',
                guardrailRules: { tool_permission: { fs_write: GUARDRAIL_RULE_DECISION.DENY_ALWAYS } }
            })
            const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]), rawAgentConfigRepository: repo })
            const tool = new UpdateAgentTool(deps)
            await tool.execute(
                {
                    agentId: 'a1',
                    removeGuardrailRules: [{ guardrailId: 'tool_permission', ruleKey: 'fs_write' }]
                },
                'caller',
                'session-1'
            )
            expect(agent.update).toHaveBeenCalledWith(expect.objectContaining({ guardrailRules: {} }))
        })

        it('ignores removal of a rule that is not currently set', async () => {
            const agent = makeAgentInterface({ id: 'a1' })
            const deps = makeDeps({ agentRegistry: makeAgentRegistry([agent]) })
            const tool = new UpdateAgentTool(deps)
            await expect(
                tool.execute(
                    {
                        agentId: 'a1',
                        removeGuardrailRules: [{ guardrailId: 'ghost', ruleKey: 'fs_write' }]
                    },
                    'caller',
                    'session-1'
                )
            ).resolves.toBeDefined()
        })
    })
})
