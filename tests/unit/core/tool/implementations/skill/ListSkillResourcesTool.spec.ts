import { ListSkillResourcesTool } from '@tool/implementations/skill/ListSkillResourcesTool'
import { AgentToolError } from '@tool/errors'
import { Skill } from '@skill'
import { makeSkillRegistryMock } from '../../../../../helpers/makeAgent'

describe('ListSkillResourcesTool', () => {
    it('has correct name', () => {
        const tool = new ListSkillResourcesTool(makeSkillRegistryMock())
        expect(tool.name).toBe('skill_resource_list')
    })

    it('throws AgentToolError when the skill is not registered', async () => {
        const tool = new ListSkillResourcesTool(makeSkillRegistryMock())
        await expect(tool.execute({ skillName: 'ghost' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })

    it('returns the resource list for the given skill', async () => {
        const skill: Skill = {
            name: 'my-skill',
            description: '',
            content: '',
            directory: '/skills/my-skill',
            resources: ['examples/usage.ts', 'templates/base.md']
        }
        const tool = new ListSkillResourcesTool(makeSkillRegistryMock([skill]))
        const result = await tool.execute({ skillName: 'my-skill' }, 'caller', 'session-1')
        expect(result).toEqual({
            skillName: 'my-skill',
            directory: '/skills/my-skill',
            resources: ['examples/usage.ts', 'templates/base.md']
        })
    })

    it('throws AgentToolError for invalid schema (empty skillName)', async () => {
        const tool = new ListSkillResourcesTool(makeSkillRegistryMock())
        await expect(tool.execute({ skillName: '' }, 'caller', 'session-1')).rejects.toThrow(AgentToolError)
    })
})
