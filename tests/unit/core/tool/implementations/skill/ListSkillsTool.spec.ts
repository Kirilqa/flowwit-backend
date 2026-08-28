import { ListSkillsTool } from '@tool/implementations/skill/ListSkillsTool'
import { SkillSummary } from '@tool/implementations/skill/types'
import { Skill } from '@skill'
import { makeSkillMock, makeSkillRegistryMock } from '../../../../../helpers/makeAgent'

function makeSkill(name: string): Skill {
    return makeSkillMock({ name, description: `Description for ${name}` })
}

describe('ListSkillsTool', () => {
    it('has correct name', () => {
        const tool = new ListSkillsTool(makeSkillRegistryMock())
        expect(tool.name).toBe('skill_list')
    })

    it('returns an empty array when no skills are registered', async () => {
        const tool = new ListSkillsTool(makeSkillRegistryMock())
        const result = await tool.execute({}, 'caller', 'session-1')
        expect(result).toEqual([])
    })

    it('returns summaries for all registered skills', async () => {
        const a = makeSkill('a')
        const b = makeSkill('b')
        const tool = new ListSkillsTool(makeSkillRegistryMock([a, b]))
        const result = (await tool.execute({}, 'caller', 'session-1')) as Array<SkillSummary>
        expect(result.map(s => s.name).sort()).toEqual(['a', 'b'])
    })

    it('maps name, description, directory and resources onto each summary', async () => {
        const skill: Skill = {
            name: 'my-skill',
            description: 'A skill',
            content: 'ignored content',
            directory: '/skills/my-skill',
            resources: ['examples/usage.ts']
        }
        const tool = new ListSkillsTool(makeSkillRegistryMock([skill]))
        const result = (await tool.execute({}, 'caller', 'session-1')) as Array<SkillSummary>
        expect(result[0]).toEqual({
            name: 'my-skill',
            description: 'A skill',
            directory: '/skills/my-skill',
            resources: ['examples/usage.ts']
        })
    })
})
