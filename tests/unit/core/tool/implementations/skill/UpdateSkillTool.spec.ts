import { UpdateSkillTool } from '@tool/implementations/skill/UpdateSkillTool'
import { AgentToolError } from '@tool/errors'
import { Skill } from '@skill'
import { makeSkillMock, makeSkillRegistryMock, makeSkillRepository } from '../../../../../helpers/makeAgent'

function makeSkill(overrides: Partial<Skill> = {}): Skill {
    return makeSkillMock({
        name: 'my-skill',
        description: 'Original description',
        content: 'Original content',
        ...overrides
    })
}

describe('UpdateSkillTool', () => {
    it('has correct name', () => {
        const tool = new UpdateSkillTool(makeSkillRepository(), makeSkillRegistryMock())
        expect(tool.name).toBe('skill_update')
    })

    it('throws AgentToolError when the skill is not registered', async () => {
        const tool = new UpdateSkillTool(makeSkillRepository(), makeSkillRegistryMock())
        await expect(tool.execute({ name: 'ghost' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('updates the description via the repository', async () => {
        const skill = makeSkill()
        const repository = makeSkillRepository([skill])
        const registry = makeSkillRegistryMock([skill])
        const tool = new UpdateSkillTool(repository, registry)
        await tool.execute({ name: 'my-skill', description: 'New description' }, 'caller', 'session-1')
        expect(repository.update).toHaveBeenCalledWith('my-skill', { description: 'New description' })
    })

    it('updates content, license, compatibility, allowedTools and metadata when provided', async () => {
        const skill = makeSkill()
        const repository = makeSkillRepository([skill])
        const registry = makeSkillRegistryMock([skill])
        const tool = new UpdateSkillTool(repository, registry)
        await tool.execute(
            {
                name: 'my-skill',
                content: 'New content',
                license: 'MIT',
                compatibility: 'node >= 18',
                allowedTools: ['tool_a'],
                metadata: { key: 'value' }
            },
            'caller',
            'session-1'
        )
        expect(repository.update).toHaveBeenCalledWith('my-skill', {
            content: 'New content',
            license: 'MIT',
            compatibility: 'node >= 18',
            allowedTools: ['tool_a'],
            metadata: { key: 'value' }
        })
    })

    it('sends an empty patch when no optional fields are provided', async () => {
        const skill = makeSkill()
        const repository = makeSkillRepository([skill])
        const registry = makeSkillRegistryMock([skill])
        const tool = new UpdateSkillTool(repository, registry)
        await tool.execute({ name: 'my-skill' }, 'caller', 'session-1')
        expect(repository.update).toHaveBeenCalledWith('my-skill', {})
    })

    it('re-registers the updated skill in the registry', async () => {
        const skill = makeSkill()
        const registry = makeSkillRegistryMock([skill])
        const tool = new UpdateSkillTool(makeSkillRepository([skill]), registry)
        await tool.execute({ name: 'my-skill', description: 'Updated' }, 'caller', 'session-1')
        expect(registry.register).toHaveBeenCalledWith('my-skill', expect.objectContaining({ description: 'Updated' }))
    })

    it('returns a SkillSummary reflecting the updated skill', async () => {
        const skill = makeSkill()
        const tool = new UpdateSkillTool(makeSkillRepository([skill]), makeSkillRegistryMock([skill]))
        const result = (await tool.execute({ name: 'my-skill', description: 'Updated' }, 'caller', 'session-1')) as {
            name: string
            description: string
        }
        expect(result.name).toBe('my-skill')
        expect(result.description).toBe('Updated')
    })

    it('throws AgentToolError for invalid schema (missing required field)', async () => {
        const tool = new UpdateSkillTool(makeSkillRepository(), makeSkillRegistryMock())
        await expect(tool.execute({}, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
