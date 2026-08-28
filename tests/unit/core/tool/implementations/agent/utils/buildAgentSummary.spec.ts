import { buildAgentSummary } from '@tool/implementations/agent/utils/buildAgentSummary'
import { AgentInterface } from '@agent/interfaces/AgentInterface'
import { AgentConfig } from '@agent/types/AgentConfig'
import { AGENT_ROLE } from '@agent/types/AgentRole'
import { RawAgentConfig } from '@agent/types/RawAgentConfig'
import { GUARDRAIL_RULE_DECISION } from '@guardrail'

function makeMinimalConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
    return {
        id: 'agent-1',
        name: 'Test Agent',
        role: AGENT_ROLE.ASSISTANT,
        model: 'claude-3',
        systemPrompt: 'You are helpful.',
        provider: { name: 'anthropic' } as AgentConfig['provider'],
        thinkingStrategy: { name: 'default' } as AgentConfig['thinkingStrategy'],
        ...overrides
    }
}

function makeAgent(config: AgentConfig): AgentInterface {
    return {
        config,
        update: () => {},
        run: async function* () {},
        stop: async () => {}
    }
}

describe('buildAgentSummary', () => {
    it('returns the agent id', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig({ id: 'my-agent' })))
        expect(summary.id).toBe('my-agent')
    })

    it('returns the agent name', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig({ name: 'My Agent' })))
        expect(summary.name).toBe('My Agent')
    })

    it('returns the agent role', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig({ role: AGENT_ROLE.ORCHESTRATOR })))
        expect(summary.role).toBe(AGENT_ROLE.ORCHESTRATOR)
    })

    it('returns the model', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig({ model: 'claude-opus-4' })))
        expect(summary.model).toBe('claude-opus-4')
    })

    it('returns the provider name', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()))
        expect(summary.provider).toBe('anthropic')
    })

    it('returns the thinkingStrategy name', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()))
        expect(summary.thinkingStrategy).toBe('default')
    })

    it('includes description when provided', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig({ description: 'handles tasks' })))
        expect(summary.description).toBe('handles tasks')
    })

    it('omits description when not provided', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()))
        expect('description' in summary).toBe(false)
    })

    it('returns empty tools array when no tools defined', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()))
        expect(summary.tools).toEqual([])
    })

    it('returns tool names when tools are defined', () => {
        const config = makeMinimalConfig({
            tools: [
                { name: 'tool_a', description: '', parameters: {}, execute: async () => {} },
                { name: 'tool_b', description: '', parameters: {}, execute: async () => {} }
            ]
        })
        const summary = buildAgentSummary(makeAgent(config))
        expect(summary.tools).toEqual(['tool_a', 'tool_b'])
    })

    it('returns empty skills array when no skills defined', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()))
        expect(summary.skills).toEqual([])
    })

    it('returns skill names when skills are defined', () => {
        const config = makeMinimalConfig({
            skills: [{ name: 'skill_a', description: '', content: '', directory: '', resources: [] }]
        })
        const summary = buildAgentSummary(makeAgent(config))
        expect(summary.skills).toEqual(['skill_a'])
    })

    it('returns empty agents array when no sub-agents defined', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()))
        expect(summary.agents).toEqual([])
    })

    it('returns sub-agent ids when agents are defined', () => {
        const subAgent = makeAgent(makeMinimalConfig({ id: 'sub-1' }))
        const config = makeMinimalConfig({ agents: [subAgent] })
        const summary = buildAgentSummary(makeAgent(config))
        expect(summary.agents).toEqual(['sub-1'])
    })

    it('returns empty mcpServers array when no servers defined', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()))
        expect(summary.mcpServers).toEqual([])
    })

    it('returns mcp server aliases when servers are defined', () => {
        const config = makeMinimalConfig({
            mcpServers: [{ alias: 'server-a' } as NonNullable<AgentConfig['mcpServers']>[0]]
        })
        const summary = buildAgentSummary(makeAgent(config))
        expect(summary.mcpServers).toEqual(['server-a'])
    })

    it('returns empty workflows array when no workflows defined', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()))
        expect(summary.workflows).toEqual([])
    })

    it('returns workflow ids when workflows are defined', () => {
        const config = makeMinimalConfig({
            workflows: [{ id: 'workflow-a' } as NonNullable<AgentConfig['workflows']>[0]]
        })
        const summary = buildAgentSummary(makeAgent(config))
        expect(summary.workflows).toEqual(['workflow-a'])
    })

    it('includes temperature when provided', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig({ temperature: 0.7 })))
        expect(summary.temperature).toBe(0.7)
    })

    it('omits temperature when not provided', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()))
        expect('temperature' in summary).toBe(false)
    })

    it('includes budget when provided', () => {
        const budget = { maxTokens: 1000 }
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig({ budget })))
        expect(summary.budget).toEqual(budget)
    })

    it('omits budget when not provided', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()))
        expect('budget' in summary).toBe(false)
    })

    it('includes guardrailRules when provided', () => {
        const guardrailRules = { tool_permission: { fs_write: GUARDRAIL_RULE_DECISION.APPROVE_ALWAYS } }
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig({ guardrailRules })))
        expect(summary.guardrailRules).toEqual(guardrailRules)
    })

    it('omits guardrailRules when not provided', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()))
        expect('guardrailRules' in summary).toBe(false)
    })

    it('includes timezone when provided', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig({ timezone: 'Europe/Moscow' })))
        expect(summary.timezone).toBe('Europe/Moscow')
    })

    it('omits timezone when not provided', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()))
        expect('timezone' in summary).toBe(false)
    })

    it('omits pattern fields when rawConfig is not provided', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()))
        expect(summary).not.toHaveProperty('toolPatterns')
        expect(summary).not.toHaveProperty('skillPatterns')
        expect(summary).not.toHaveProperty('agentPatterns')
        expect(summary).not.toHaveProperty('mcpServerPatterns')
        expect(summary).not.toHaveProperty('workflowPatterns')
    })

    it('omits pattern fields when rawConfig is null', () => {
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()), null)
        expect(summary).not.toHaveProperty('toolPatterns')
    })

    it('includes pattern fields from rawConfig when present', () => {
        const rawConfig: RawAgentConfig = {
            id: 'agent-1',
            name: 'Test Agent',
            role: AGENT_ROLE.ASSISTANT,
            provider: 'anthropic',
            model: 'claude-3',
            systemPrompt: '',
            thinkingStrategy: 'default',
            tools: ['fs_*'],
            skills: ['code-review'],
            agents: ['sub-*'],
            mcpServers: ['my-mcp'],
            workflows: ['workflow-a']
        }
        const summary = buildAgentSummary(makeAgent(makeMinimalConfig()), rawConfig)
        expect(summary.toolPatterns).toEqual(['fs_*'])
        expect(summary.skillPatterns).toEqual(['code-review'])
        expect(summary.agentPatterns).toEqual(['sub-*'])
        expect(summary.mcpServerPatterns).toEqual(['my-mcp'])
        expect(summary.workflowPatterns).toEqual(['workflow-a'])
    })
})
