import { DeleteSkillTool } from '@tool/implementations/skill/DeleteSkillTool'
import { AgentToolError } from '@tool/errors'
import { Skill } from '@skill'
import { makeSkillMock, makeSkillRegistryMock, makeSkillRepository } from '../../../../../helpers/makeAgent'

function makeSkill(name = 'my-skill'): Skill {
    return makeSkillMock({ name })
}

describe('DeleteSkillTool', () => {
    it('has correct name', () => {
        const tool = new DeleteSkillTool(makeSkillRepository(), makeSkillRegistryMock())
        expect(tool.name).toBe('skill_delete')
    })

    it('throws AgentToolError when the skill is not registered', async () => {
        const tool = new DeleteSkillTool(makeSkillRepository(), makeSkillRegistryMock())
        await expect(tool.execute({ name: 'ghost' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('deletes the skill via the repository', async () => {
        const skill = makeSkill()
        const repository = makeSkillRepository([skill])
        const registry = makeSkillRegistryMock([skill])
        const tool = new DeleteSkillTool(repository, registry)
        await tool.execute({ name: 'my-skill' }, 'caller', 'session-1')
        expect(repository.delete).toHaveBeenCalledWith('my-skill')
    })

    it('unregisters the skill from the registry', async () => {
        const skill = makeSkill()
        const registry = makeSkillRegistryMock([skill])
        const tool = new DeleteSkillTool(makeSkillRepository([skill]), registry)
        await tool.execute({ name: 'my-skill' }, 'caller', 'session-1')
        expect(registry.unregister).toHaveBeenCalledWith('my-skill')
    })

    it('returns a success message containing the skill name', async () => {
        const skill = makeSkill()
        const tool = new DeleteSkillTool(makeSkillRepository([skill]), makeSkillRegistryMock([skill]))
        const result = await tool.execute({ name: 'my-skill' }, 'caller', 'session-1')
        expect(result).toContain('my-skill')
    })

    it('throws AgentToolError for invalid schema (empty name)', async () => {
        const tool = new DeleteSkillTool(makeSkillRepository(), makeSkillRegistryMock())
        await expect(tool.execute({ name: '' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
