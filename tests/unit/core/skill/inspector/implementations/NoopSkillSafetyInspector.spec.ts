import { NoopSkillSafetyInspector } from '@skill/inspector/implementations/NoopSkillSafetyInspector'
import { SKILL_SAFETY_ACTION, SkillSafetyInspectionContext } from '@skill/inspector'

describe('NoopSkillSafetyInspector', () => {
    const inspector = new NoopSkillSafetyInspector()

    const context: SkillSafetyInspectionContext = {
        slug: 'my-skill',
        scan: null,
        files: { 'index.md': '# Skill content' }
    }

    it('returns ALLOW for any context', async () => {
        const result = await inspector.inspect(context)
        expect(result.action).toBe(SKILL_SAFETY_ACTION.ALLOW)
    })

    it('returns ALLOW when scan is null', async () => {
        const result = await inspector.inspect({ slug: 'x', scan: null, files: {} })
        expect(result.action).toBe(SKILL_SAFETY_ACTION.ALLOW)
    })

    it('returns ALLOW when files are empty', async () => {
        const result = await inspector.inspect({ slug: 'x', scan: null, files: {} })
        expect(result.action).toBe(SKILL_SAFETY_ACTION.ALLOW)
    })

    it('always returns the same action regardless of slug', async () => {
        const r1 = await inspector.inspect({ ...context, slug: 'skill-a' })
        const r2 = await inspector.inspect({ ...context, slug: 'skill-b' })
        expect(r1.action).toBe(r2.action)
    })
})
