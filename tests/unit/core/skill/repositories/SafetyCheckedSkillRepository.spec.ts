import { SafetyCheckedSkillRepository } from '@skill/repositories/SafetyCheckedSkillRepository'
import { SKILL_SAFETY_ACTION, SkillSafetyInspectorInterface } from '@skill/inspector'
import { makeSkillRepository } from '../../../../helpers/makeAgent'

function makeInspector(action: 'allow' | 'block'): SkillSafetyInspectorInterface {
    return {
        inspect: jest
            .fn()
            .mockResolvedValue(
                action === 'block'
                    ? { action: SKILL_SAFETY_ACTION.BLOCK, reason: 'looks malicious' }
                    : { action: SKILL_SAFETY_ACTION.ALLOW }
            )
    }
}

describe('SafetyCheckedSkillRepository', () => {
    it('runs safety inspection for a write under scripts/', async () => {
        const inner = makeSkillRepository()
        const inspector = makeInspector('allow')
        const repository = new SafetyCheckedSkillRepository(inner, inspector)

        await repository.writeResource('my-skill', 'scripts/build.py', Buffer.from('print(1)'))

        expect(inspector.inspect).toHaveBeenCalledWith({
            slug: 'my-skill',
            scan: null,
            files: { 'scripts/build.py': 'print(1)' }
        })
        expect(inner.writeResource).toHaveBeenCalledWith('my-skill', 'scripts/build.py', Buffer.from('print(1)'))
    })

    it('blocks the write when the inspector blocks', async () => {
        const inner = makeSkillRepository()
        const inspector = makeInspector('block')
        const repository = new SafetyCheckedSkillRepository(inner, inspector)

        await expect(repository.writeResource('my-skill', 'scripts/evil.py', Buffer.from('rm -rf /'))).rejects.toThrow(
            /looks malicious/
        )

        expect(inner.writeResource).not.toHaveBeenCalled()
    })

    it('does not run safety inspection for a write outside scripts/', async () => {
        const inner = makeSkillRepository()
        const inspector = makeInspector('allow')
        const repository = new SafetyCheckedSkillRepository(inner, inspector)

        await repository.writeResource('my-skill', 'references/notes.md', Buffer.from('hello'))

        expect(inspector.inspect).not.toHaveBeenCalled()
        expect(inner.writeResource).toHaveBeenCalledWith('my-skill', 'references/notes.md', Buffer.from('hello'))
    })

    it('delegates all other methods straight through', async () => {
        const inner = makeSkillRepository()
        const inspector = makeInspector('allow')
        const repository = new SafetyCheckedSkillRepository(inner, inspector)

        await repository.writeResource('my-skill', 'notes.md', Buffer.from('hello'))
        await repository.findAll()
        await repository.findById('my-skill')
        await repository.delete('my-skill')
        await repository.deleteResource('my-skill', 'notes.md')

        expect(inner.findAll).toHaveBeenCalled()
        expect(inner.findById).toHaveBeenCalledWith('my-skill')
        expect(inner.delete).toHaveBeenCalledWith('my-skill')
        expect(inner.deleteResource).toHaveBeenCalledWith('my-skill', 'notes.md')
    })
})
