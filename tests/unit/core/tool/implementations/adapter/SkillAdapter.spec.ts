import { SkillAdapter } from '@tool/implementations/adapter/SkillAdapter'
import { makeSkillMock as makeSkill } from '../../../../../helpers/makeAgent'

describe('SkillAdapter', () => {
    describe('constructor', () => {
        it('prefixes skill name with skill__', () => {
            const adapter = new SkillAdapter(makeSkill({ name: 'my_skill' }))
            expect(adapter.name).toBe('skill__my_skill')
        })

        it('uses skill.description as description', () => {
            const adapter = new SkillAdapter(makeSkill({ description: 'A cool skill' }))
            expect(adapter.description).toBe('A cool skill')
        })

        it('has empty parameters schema', () => {
            const adapter = new SkillAdapter(makeSkill())
            expect(adapter.parameters).toEqual({ type: 'object', properties: {}, required: [] })
        })
    })

    describe('execute()', () => {
        it('returns a string containing the skill name', async () => {
            const adapter = new SkillAdapter(makeSkill({ name: 'my_skill' }))
            const result = await adapter.execute({})
            expect(result).toContain('my_skill')
        })

        it('returns a string containing the skill directory', async () => {
            const adapter = new SkillAdapter(makeSkill({ directory: '/workspace/skills' }))
            const result = await adapter.execute({})
            expect(result).toContain('/workspace/skills')
        })

        it('returns a string containing the skill content inside instructions tags', async () => {
            const adapter = new SkillAdapter(makeSkill({ content: 'Do the thing.' }))
            const result = await adapter.execute({})
            expect(result).toContain('<instructions>')
            expect(result).toContain('Do the thing.')
            expect(result).toContain('</instructions>')
        })

        it('includes compatibility when set', async () => {
            const adapter = new SkillAdapter(makeSkill({ compatibility: 'Claude 3+' }))
            const result = await adapter.execute({})
            expect(result).toContain('Claude 3+')
        })

        it('omits compatibility section when not set', async () => {
            const adapter = new SkillAdapter(makeSkill())
            const result = await adapter.execute({})
            expect(result).not.toContain('Compatibility')
        })

        it('includes resource paths inside resources tags when present', async () => {
            const adapter = new SkillAdapter(
                makeSkill({
                    directory: '/skills/my_skill',
                    resources: ['data.json']
                })
            )
            const result = await adapter.execute({})
            expect(result).toContain('<resources>')
            expect(result).toContain('data.json')
            expect(result).toContain('</resources>')
        })

        it('omits resources section when resources is empty', async () => {
            const adapter = new SkillAdapter(makeSkill({ resources: [] }))
            const result = await adapter.execute({})
            expect(result).not.toContain('<resources>')
        })

        it('ignores args parameter', async () => {
            const adapter = new SkillAdapter(makeSkill())
            const result = await adapter.execute({ anything: 'ignored' })
            expect(typeof result).toBe('string')
        })
    })
})
