import { createRawAgentFactory } from '@agent/utils/createRawAgentFactory'
import { AgentConfigError } from '@agent/errors/AgentConfigError'
import { AgentConfigRegistryDependencies } from '@agent/types/AgentConfigRegistryDependencies'
import { RawAgentConfig } from '@agent/types/RawAgentConfig'
import { AGENT_ROLE } from '@agent/types/AgentRole'
import { AgentInterface } from '@agent/interfaces/AgentInterface'
import { AgentFactory } from '@agent/types/AgentFactory'
import {
    makeAgentDependencies,
    makeAgentConfigRegistryDeps,
    makeProviderRegistry,
    makeThinkingStrategyRegistry
} from '../../../../helpers/makeAgent'
import { makeProvider } from '../../../../helpers/TestProvider'
import { ReActStrategy } from '@strategy'
import { createAgentFactory } from '@agent/utils/createAgentFactory'
import { NoopLogger } from '@logger'

const testProvider = makeProvider()
const testStrategy = new ReActStrategy()

const RAW: RawAgentConfig = {
    id: 'raw-agent',
    name: 'Raw Agent',
    role: AGENT_ROLE.ASSISTANT,
    provider: 'test',
    model: 'test-model',
    systemPrompt: 'Hello',
    thinkingStrategy: 'ReAct'
}

function makeDeps(providerFound = true, strategyFound = true): AgentConfigRegistryDependencies {
    return makeAgentConfigRegistryDeps({
        providerRegistry: makeProviderRegistry(testProvider, providerFound),
        thinkingStrategyRegistry: makeThinkingStrategyRegistry(testStrategy, strategyFound)
    })
}

describe('createRawAgentFactory', () => {
    const logger = new NoopLogger()

    it('returns a function', () => {
        const agentFactory = createAgentFactory(makeAgentDependencies())
        const rawFactory = createRawAgentFactory(makeDeps(), agentFactory, logger)
        expect(typeof rawFactory).toBe('function')
    })

    it('creates an agent from a valid raw config', () => {
        const agentFactory = createAgentFactory(makeAgentDependencies())
        const rawFactory = createRawAgentFactory(makeDeps(), agentFactory, logger)
        const agent = rawFactory(RAW)
        expect(agent.config.id).toBe('raw-agent')
        expect(agent.config.name).toBe('Raw Agent')
    })

    it('throws AgentConfigError when provider is not found', () => {
        const agentFactory = createAgentFactory(makeAgentDependencies())
        const rawFactory = createRawAgentFactory(makeDeps(false), agentFactory, logger)
        expect(() => rawFactory(RAW)).toThrow(AgentConfigError)
    })

    it('throws AgentConfigError when thinking strategy is not found', () => {
        const agentFactory = createAgentFactory(makeAgentDependencies())
        const rawFactory = createRawAgentFactory(makeDeps(true, false), agentFactory, logger)
        expect(() => rawFactory(RAW)).toThrow(AgentConfigError)
    })

    it('error message includes the agent name', () => {
        const agentFactory = createAgentFactory(makeAgentDependencies())
        const rawFactory = createRawAgentFactory(makeDeps(false), agentFactory, logger)
        expect(() => rawFactory(RAW)).toThrow('"Raw Agent"')
    })

    it('passes the default timezone through to the hydrated config', () => {
        const agentFactory = createAgentFactory(makeAgentDependencies())
        const rawFactory = createRawAgentFactory(makeDeps(), agentFactory, logger, 'Europe/Moscow')
        const agent = rawFactory(RAW)
        expect(agent.config.timezone).toBe('Europe/Moscow')
    })

    it('calls agentFactory with the hydrated config', () => {
        const mockFactory: AgentFactory = jest.fn().mockImplementation((config): AgentInterface => ({
            config,
            update: jest.fn(),
            run: jest.fn().mockReturnValue((async function* () {})()),
            stop: jest.fn().mockResolvedValue(undefined)
        }))
        const rawFactory = createRawAgentFactory(makeDeps(), mockFactory, logger)
        rawFactory(RAW)
        expect(mockFactory).toHaveBeenCalledTimes(1)
    })
})
