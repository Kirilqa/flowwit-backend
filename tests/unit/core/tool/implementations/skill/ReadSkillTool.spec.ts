import { ReadSkillTool } from '@tool/implementations/skill/ReadSkillTool'
import { AgentToolError } from '@tool/errors'
import { Skill } from '@skill'
import { makeSkillRegistryMock } from '../../../../../helpers/makeAgent'

describe('ReadSkillTool', () => {
    it('has correct name', () => {
        const tool = new ReadSkillTool(makeSkillRegistryMock())
        expect(tool.name).toBe('skill_read')
    })

    it('throws AgentToolError when the skill is not registered', async () => {
        const tool = new ReadSkillTool(makeSkillRegistryMock())
        await expect(tool.execute({ name: 'ghost' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('returns the full skill object', async () => {
        const skill: Skill = {
            name: 'my-skill',
            description: 'A skill',
            content: 'Full instructions',
            directory: '/skills/my-skill',
            resources: ['examples/usage.ts']
        }
        const tool = new ReadSkillTool(makeSkillRegistryMock([skill]))
        const result = await tool.execute({ name: 'my-skill' }, 'caller', 'session-1')
        expect(result).toEqual(skill)
    })

    it('throws AgentToolError for invalid schema (empty name)', async () => {
        const tool = new ReadSkillTool(makeSkillRegistryMock())
        await expect(tool.execute({ name: '' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
