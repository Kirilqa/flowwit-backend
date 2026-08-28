import { CreateAgentTool } from '@tool/implementations/agent/CreateAgentTool'
import { AgentToolError } from '@tool/errors/AgentToolError'
import { AGENT_ROLE } from '@agent/types/AgentRole'
import { RawAgentConfig } from '@agent/types/RawAgentConfig'
import { AgentInterface } from '@agent/interfaces/AgentInterface'
import { makeAgentInterface, makeAgentRegistry, makeRawAgentConfigRepository } from '../../../../../helpers/makeAgent'
import { createAgentFactory } from '@agent/utils/createAgentFactory'
import { makeAgentDependencies, makeAgentConfig } from '../../../../../helpers/makeAgent'
import { makeSimpleRegistry } from '../../../../../helpers/makeRegistry'
import { GUARDRAIL_RULE_DECISION, GuardrailInterface } from '@guardrail'

function makeGuardrailRegistry(guardrails: Record<string, GuardrailInterface> = {}) {
    return makeSimpleRegistry<GuardrailInterface>(guardrails)
}

const VALID_ARGS = {
    id: 'new-agent',
    name: 'New Agent',
    role: AGENT_ROLE.ASSISTANT,
    provider: 'test',
    model: 'test-model',
    systemPrompt: 'You are helpful.',
    thinkingStrategy: 'react'
}

function makeRawFactory(): (raw: RawAgentConfig) => AgentInterface {
    const agentFactory = createAgentFactory(makeAgentDependencies())
    return raw => agentFactory(makeAgentConfig({ id: raw.id, name: raw.name }))
}

describe('CreateAgentTool', () => {
    it('has correct name', () => {
        const tool = new CreateAgentTool(makeRawFactory(), makeAgentRegistry(), null, makeGuardrailRegistry())
        expect(tool.name).toBe('agent_create')
    })

    it('throws AgentToolError when agent id already exists', async () => {
        const existing = makeAgentInterface({ id: 'new-agent' })
        const registry = makeAgentRegistry([existing])
        const tool = new CreateAgentTool(makeRawFactory(), registry, null, makeGuardrailRegistry())
        await expect(tool.execute(VALID_ARGS, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('registers the new agent in the registry', async () => {
        const registry = makeAgentRegistry()
        const tool = new CreateAgentTool(makeRawFactory(), registry, null, makeGuardrailRegistry())
        await tool.execute(VALID_ARGS, 'caller', 'session-1')
        expect(registry.register).toHaveBeenCalledWith('new-agent', expect.anything())
    })

    it('calls repository.create when repository is provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, makeGuardrailRegistry())
        await tool.execute(VALID_ARGS, 'caller', 'session-1')
        expect(repo.create).toHaveBeenCalledTimes(1)
    })

    it('does not call repository when repository is null', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, null, makeGuardrailRegistry())
        await tool.execute(VALID_ARGS, 'caller', 'session-1')
        expect(repo.create).not.toHaveBeenCalled()
    })

    it('returns an AgentSummary with the correct id and name', async () => {
        const registry = makeAgentRegistry()
        const tool = new CreateAgentTool(makeRawFactory(), registry, null, makeGuardrailRegistry())
        const result = (await tool.execute(VALID_ARGS, 'caller', 'session-1')) as { id: string; name: string }
        expect(result.id).toBe('new-agent')
        expect(result.name).toBe('New Agent')
    })

    it('includes optional description in raw config when provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, makeGuardrailRegistry())
        await tool.execute({ ...VALID_ARGS, description: 'A helper' }, 'caller', 'session-1')
        const createCall = (repo.create as jest.Mock).mock.calls[0]
        const raw = createCall?.[0] as RawAgentConfig
        expect(raw.description).toBe('A helper')
    })

    it('includes budget when provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, makeGuardrailRegistry())
        await tool.execute({ ...VALID_ARGS, budget: { maxIterations: 5 } }, 'caller', 'session-1')
        const raw = (repo.create as jest.Mock).mock.calls[0]?.[0] as RawAgentConfig
        expect(raw.budget).toEqual({ maxIterations: 5 })
    })

    it('includes tools list in raw config when provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, makeGuardrailRegistry())
        await tool.execute({ ...VALID_ARGS, tools: ['search', 'calc'] }, 'caller', 'session-1')
        const raw = (repo.create as jest.Mock).mock.calls[0]?.[0] as RawAgentConfig
        expect(raw.tools).toEqual(['search', 'calc'])
    })

    it('includes skills list in raw config when provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, makeGuardrailRegistry())
        await tool.execute({ ...VALID_ARGS, skills: ['code-review'] }, 'caller', 'session-1')
        const raw = (repo.create as jest.Mock).mock.calls[0]?.[0] as RawAgentConfig
        expect(raw.skills).toEqual(['code-review'])
    })

    it('includes agents list in raw config when provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, makeGuardrailRegistry())
        await tool.execute({ ...VALID_ARGS, agents: ['sub-agent-1'] }, 'caller', 'session-1')
        const raw = (repo.create as jest.Mock).mock.calls[0]?.[0] as RawAgentConfig
        expect(raw.agents).toEqual(['sub-agent-1'])
    })

    it('includes temperature in raw config when provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, makeGuardrailRegistry())
        await tool.execute({ ...VALID_ARGS, temperature: 0.7 }, 'caller', 'session-1')
        const raw = (repo.create as jest.Mock).mock.calls[0]?.[0] as RawAgentConfig
        expect(raw.temperature).toBe(0.7)
    })

    it('includes mcpServers list in raw config when provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, makeGuardrailRegistry())
        await tool.execute({ ...VALID_ARGS, mcpServers: ['my-mcp'] }, 'caller', 'session-1')
        const raw = (repo.create as jest.Mock).mock.calls[0]?.[0] as RawAgentConfig
        expect(raw.mcpServers).toEqual(['my-mcp'])
    })

    it('includes workflows list in raw config when provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, makeGuardrailRegistry())
        await tool.execute({ ...VALID_ARGS, workflows: ['my-workflow'] }, 'caller', 'session-1')
        const raw = (repo.create as jest.Mock).mock.calls[0]?.[0] as RawAgentConfig
        expect(raw.workflows).toEqual(['my-workflow'])
    })

    it('includes metadata in raw config when provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, makeGuardrailRegistry())
        await tool.execute({ ...VALID_ARGS, metadata: { env: 'prod' } }, 'caller', 'session-1')
        const raw = (repo.create as jest.Mock).mock.calls[0]?.[0] as { metadata?: Record<string, unknown> }
        expect(raw.metadata).toEqual({ env: 'prod' })
    })

    it('includes all budget fields when provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, makeGuardrailRegistry())
        const budget = { maxTokens: 1000, maxIterations: 5, maxToolCalls: 10, maxCostUsd: 0.5, maxDurationMs: 60000 }
        await tool.execute({ ...VALID_ARGS, budget }, 'caller', 'session-1')
        const raw = (repo.create as jest.Mock).mock.calls[0]?.[0] as RawAgentConfig
        expect(raw.budget).toEqual(budget)
    })

    it('includes timezone in raw config when provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, makeGuardrailRegistry())
        await tool.execute({ ...VALID_ARGS, timezone: 'Europe/Moscow' }, 'caller', 'session-1')
        const raw = (repo.create as jest.Mock).mock.calls[0]?.[0] as RawAgentConfig
        expect(raw.timezone).toBe('Europe/Moscow')
    })

    it('throws AgentToolError for an invalid IANA timezone', async () => {
        const registry = makeAgentRegistry()
        const tool = new CreateAgentTool(makeRawFactory(), registry, null, makeGuardrailRegistry())
        await expect(tool.execute({ ...VALID_ARGS, timezone: 'Not/A_Zone' }, 'caller', 'session-1')).rejects.toThrow(
            AgentToolError
        )
    })

    it('throws AgentToolError for invalid schema (missing required field)', async () => {
        const registry = makeAgentRegistry()
        const tool = new CreateAgentTool(makeRawFactory(), registry, null, makeGuardrailRegistry())
        await expect(
            tool.execute({ name: 'Agent', role: AGENT_ROLE.ASSISTANT }, 'caller', 'session-1')
        ).rejects.toThrow(AgentToolError)
    })

    it('throws AgentToolError when a guardrailRules entry references an unknown guardrail', async () => {
        const registry = makeAgentRegistry()
        const tool = new CreateAgentTool(makeRawFactory(), registry, null, makeGuardrailRegistry())
        await expect(
            tool.execute(
                {
                    ...VALID_ARGS,
                    guardrailRules: [
                        { guardrailId: 'ghost', ruleKey: 'fs_write', decision: GUARDRAIL_RULE_DECISION.DENY_ALWAYS }
                    ]
                },
                'caller',
                'session-1'
            )
        ).rejects.toThrow(AgentToolError)
    })

    it('includes guardrailRules grouped by guardrailId in the raw config when provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const guardrailRegistry = makeGuardrailRegistry({
            tool_permission: {} as GuardrailInterface,
            shell_command: {} as GuardrailInterface
        })
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, guardrailRegistry)
        await tool.execute(
            {
                ...VALID_ARGS,
                guardrailRules: [
                    {
                        guardrailId: 'tool_permission',
                        ruleKey: 'fs_write',
                        decision: GUARDRAIL_RULE_DECISION.DENY_ALWAYS
                    },
                    {
                        guardrailId: 'tool_permission',
                        ruleKey: 'fs_read',
                        decision: GUARDRAIL_RULE_DECISION.APPROVE_ALWAYS
                    },
                    { guardrailId: 'shell_command', ruleKey: 'rm', decision: GUARDRAIL_RULE_DECISION.DENY_ALWAYS }
                ]
            },
            'caller',
            'session-1'
        )
        const raw = (repo.create as jest.Mock).mock.calls[0]?.[0] as RawAgentConfig
        expect(raw.guardrailRules).toEqual({
            tool_permission: {
                fs_write: GUARDRAIL_RULE_DECISION.DENY_ALWAYS,
                fs_read: GUARDRAIL_RULE_DECISION.APPROVE_ALWAYS
            },
            shell_command: { rm: GUARDRAIL_RULE_DECISION.DENY_ALWAYS }
        })
    })

    it('omits guardrailRules from the raw config when none are provided', async () => {
        const registry = makeAgentRegistry()
        const repo = makeRawAgentConfigRepository()
        const tool = new CreateAgentTool(makeRawFactory(), registry, repo, makeGuardrailRegistry())
        await tool.execute(VALID_ARGS, 'caller', 'session-1')
        const raw = (repo.create as jest.Mock).mock.calls[0]?.[0] as RawAgentConfig
        expect(raw).not.toHaveProperty('guardrailRules')
    })
})
