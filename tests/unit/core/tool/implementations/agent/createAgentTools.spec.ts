import { createAgentTools } from '@tool/implementations/agent/utils/createAgentTools'
import { CreateAgentToolsDependencies } from '@tool/implementations/agent/types'
import { RawAgentFactory } from '@agent/types/RawAgentFactory'
import {
    makeAgentRegistry,
    makeRawAgentConfigRepository,
    makeProviderRegistry,
    makeThinkingStrategyRegistry,
    makeToolRegistryMock,
    makeSkillRegistryMock,
    makeMCPServerRegistryMock,
    makeWorkFlowRegistryMock
} from '../../../../../helpers/makeAgent'
import { makeSimpleRegistry } from '../../../../../helpers/makeRegistry'
import { GuardrailInterface } from '@guardrail'

function makeDeps(withRepo = false): CreateAgentToolsDependencies {
    return {
        rawAgentFactory: jest.fn() as RawAgentFactory,
        agentRegistry: makeAgentRegistry(),
        providerRegistry: makeProviderRegistry(),
        thinkingStrategyRegistry: makeThinkingStrategyRegistry(),
        toolRegistry: makeToolRegistryMock(),
        skillRegistry: makeSkillRegistryMock(),
        mcpServerRegistry: makeMCPServerRegistryMock(),
        workflowRegistry: makeWorkFlowRegistryMock(),
        guardrailRegistry: makeSimpleRegistry<GuardrailInterface>(),
        ...(withRepo && { rawAgentConfigRepository: makeRawAgentConfigRepository() })
    }
}

describe('createAgentTools', () => {
    it('returns an array of 7 tools', () => {
        const tools = createAgentTools(makeDeps())
        expect(tools).toHaveLength(7)
    })

    it('includes agent_create tool', () => {
        const tools = createAgentTools(makeDeps())
        expect(tools.some(t => t.name === 'agent_create')).toBe(true)
    })

    it('includes agent_update tool', () => {
        const tools = createAgentTools(makeDeps())
        expect(tools.some(t => t.name === 'agent_update')).toBe(true)
    })

    it('includes agent_delete tool', () => {
        const tools = createAgentTools(makeDeps())
        expect(tools.some(t => t.name === 'agent_delete')).toBe(true)
    })

    it('includes agent_list tool', () => {
        const tools = createAgentTools(makeDeps())
        expect(tools.some(t => t.name === 'agent_list')).toBe(true)
    })

    it('includes agent_info tool', () => {
        const tools = createAgentTools(makeDeps())
        expect(tools.some(t => t.name === 'agent_info')).toBe(true)
    })

    it('includes agent_register tool', () => {
        const tools = createAgentTools(makeDeps())
        expect(tools.some(t => t.name === 'agent_register')).toBe(true)
    })

    it('includes agent_unregister tool', () => {
        const tools = createAgentTools(makeDeps())
        expect(tools.some(t => t.name === 'agent_unregister')).toBe(true)
    })

    it('all tools have non-empty descriptions', () => {
        const tools = createAgentTools(makeDeps())
        for (const tool of tools) {
            expect(tool.description.length).toBeGreaterThan(0)
        }
    })

    it('works without rawAgentConfigRepository', () => {
        const tools = createAgentTools(makeDeps(false))
        expect(tools).toHaveLength(7)
    })

    it('works with rawAgentConfigRepository', () => {
        const tools = createAgentTools(makeDeps(true))
        expect(tools).toHaveLength(7)
    })
})
