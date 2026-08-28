import { buildAgentIdentityPrompt } from '@agent/prompts/buildAgentIdentityPrompt'
import { makeAgentConfig } from '../../../../helpers/makeAgent'

describe('buildAgentIdentityPrompt', () => {
    it('includes id, name, role, provider and model', () => {
        const config = makeAgentConfig({ id: 'agent-1', name: 'Assistant', model: 'test-model' })
        const prompt = buildAgentIdentityPrompt(config)

        expect(prompt).toContain('- ID: agent-1')
        expect(prompt).toContain('- Name: Assistant')
        expect(prompt).toContain('- Role: assistant')
        expect(prompt).toContain('- Provider: test')
        expect(prompt).toContain('- Model: test-model')
    })

    it('includes a description line when provided', () => {
        const config = makeAgentConfig({ description: 'Handles customer support' })
        const prompt = buildAgentIdentityPrompt(config)

        expect(prompt).toContain('- Description: Handles customer support')
    })

    it('omits the description line when not provided', () => {
        const config = makeAgentConfig()
        const prompt = buildAgentIdentityPrompt(config)

        expect(prompt).not.toContain('- Description:')
    })

    it('starts with the "## Identity" heading', () => {
        const config = makeAgentConfig()
        const prompt = buildAgentIdentityPrompt(config)

        expect(prompt.startsWith('## Identity\n')).toBe(true)
    })
})
