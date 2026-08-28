import { WorkFlowNodeError } from '@workflow'
import { SkillNode } from '@workflow/implementations/node/SkillNode'
import { Skill } from '@skill'
import { runNode } from '../../../../../helpers/runNode'
import { makeSimpleRegistry } from '../../../../../helpers/makeRegistry'
import { makeSkillMock as makeSkill } from '../../../../../helpers/makeAgent'

function makeRegistry(skills: Record<string, Skill> = {}) {
    return makeSimpleRegistry<Skill>(skills)
}

describe('SkillNode', () => {
    it('has type "skill"', () => {
        expect(new SkillNode(makeRegistry()).type).toBe('skill')
    })

    it('is not a start node', () => {
        expect(new SkillNode(makeRegistry()).isStart).toBe(false)
    })

    it('isReady when trigger port is provided', () => {
        const node = new SkillNode(makeRegistry())
        expect(node.isReady(new Set(['trigger']))).toBe(true)
    })

    it('returns a string result containing the skill name', async () => {
        const node = new SkillNode(makeRegistry({ my_skill: makeSkill({ name: 'my_skill' }) }))
        const { result } = await runNode(node.execute({ trigger: null }, { skillName: 'my_skill' }))
        expect(typeof result.output['result']).toBe('string')
        expect(result.output['result']).toContain('my_skill')
    })

    it('returns skill content in the result', async () => {
        const node = new SkillNode(makeRegistry({ my_skill: makeSkill({ content: 'Do the thing.' }) }))
        const { result } = await runNode(node.execute({ trigger: null }, { skillName: 'my_skill' }))
        expect(result.output['result']).toContain('Do the thing.')
    })

    it('throws WorkFlowNodeError when skill is not found in registry', async () => {
        const node = new SkillNode(makeRegistry())
        await expect(runNode(node.execute({ trigger: null }, { skillName: 'missing' }))).rejects.toThrow(
            WorkFlowNodeError
        )
    })

    it('throws when skillName config is missing', async () => {
        const node = new SkillNode(makeRegistry({ my_skill: makeSkill() }))
        await expect(runNode(node.execute({ trigger: null }, {}))).rejects.toThrow()
    })

    it('emits no events', async () => {
        const node = new SkillNode(makeRegistry({ my_skill: makeSkill() }))
        const { events } = await runNode(node.execute({ trigger: null }, { skillName: 'my_skill' }))
        expect(events).toHaveLength(0)
    })
})
