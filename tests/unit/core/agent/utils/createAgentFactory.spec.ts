import { createAgentFactory } from '@agent/utils/createAgentFactory'
import { Agent } from '@agent/implementations/Agent'
import { makeAgentConfig, makeAgentDependencies } from '../../../../helpers/makeAgent'

describe('createAgentFactory', () => {
    it('returns a function', () => {
        const deps = makeAgentDependencies()
        const factory = createAgentFactory(deps)
        expect(typeof factory).toBe('function')
    })

    it('factory creates an Agent instance', () => {
        const deps = makeAgentDependencies()
        const factory = createAgentFactory(deps)
        const config = makeAgentConfig()
        const agent = factory(config)
        expect(agent).toBeInstanceOf(Agent)
    })

    it('factory passes config to the agent', () => {
        const deps = makeAgentDependencies()
        const factory = createAgentFactory(deps)
        const config = makeAgentConfig({ id: 'my-agent', name: 'My Agent' })
        const agent = factory(config)
        expect(agent.config.id).toBe('my-agent')
        expect(agent.config.name).toBe('My Agent')
    })

    it('same dependencies are shared across agents created by the same factory', () => {
        const deps = makeAgentDependencies()
        const factory = createAgentFactory(deps)
        const agent1 = factory(makeAgentConfig({ id: 'a1' }))
        const agent2 = factory(makeAgentConfig({ id: 'a2' }))
        expect(agent1).toBeInstanceOf(Agent)
        expect(agent2).toBeInstanceOf(Agent)
        expect(agent1.config.id).toBe('a1')
        expect(agent2.config.id).toBe('a2')
    })
})
