import { writeFile } from 'fs/promises'
import { join } from 'path'
import { GuardrailRulesData } from '@guardrail'
import { JsonGuardrailRulesRepository } from '@guardrail/rules/repositories/JsonGuardrailRulesRepository'
import { makeTempDir, removeTempDir } from '../../../../../helpers/tempDir'

describe('JsonGuardrailRulesRepository', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('guardrail-rules-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    describe('load()', () => {
        it('returns empty structure when file does not exist', async () => {
            const repo = new JsonGuardrailRulesRepository(join(tempDir, 'missing.json'))
            const data = await repo.load()
            expect(data).toEqual({ global: {}, sessions: {} })
        })

        it('loads valid data from file', async () => {
            const filePath = join(tempDir, 'rules.json')
            const expected: GuardrailRulesData = {
                global: { g1: { key1: 'approve_always' } },
                sessions: { s1: { g1: { key1: 'deny_always' } } }
            }
            await writeFile(filePath, JSON.stringify(expected), 'utf-8')

            const repo = new JsonGuardrailRulesRepository(filePath)
            const data = await repo.load()
            expect(data).toEqual(expected)
        })

        it('throws when file contains invalid JSON', async () => {
            const filePath = join(tempDir, 'bad.json')
            await writeFile(filePath, '{ not valid json', 'utf-8')

            const repo = new JsonGuardrailRulesRepository(filePath)
            await expect(repo.load()).rejects.toThrow('Failed to parse JSON')
        })

        it('returns empty structure when file has wrong shape (missing global)', async () => {
            const filePath = join(tempDir, 'wrong.json')
            await writeFile(filePath, JSON.stringify({ sessions: {} }), 'utf-8')

            const repo = new JsonGuardrailRulesRepository(filePath)
            const data = await repo.load()
            expect(data).toEqual({ global: {}, sessions: {} })
        })

        it('returns empty structure when file has wrong shape (missing sessions)', async () => {
            const filePath = join(tempDir, 'wrong2.json')
            await writeFile(filePath, JSON.stringify({ global: {} }), 'utf-8')

            const repo = new JsonGuardrailRulesRepository(filePath)
            const data = await repo.load()
            expect(data).toEqual({ global: {}, sessions: {} })
        })

        it('returns empty structure when file contains null', async () => {
            const filePath = join(tempDir, 'null.json')
            await writeFile(filePath, 'null', 'utf-8')

            const repo = new JsonGuardrailRulesRepository(filePath)
            const data = await repo.load()
            expect(data).toEqual({ global: {}, sessions: {} })
        })
    })

    describe('save()', () => {
        it('writes data to file and can be loaded back', async () => {
            const filePath = join(tempDir, 'rules.json')
            const repo = new JsonGuardrailRulesRepository(filePath)

            const data: GuardrailRulesData = {
                global: { g1: { myKey: 'deny_always' } },
                sessions: { s1: { g1: { myKey: 'approve_always' } } }
            }

            await repo.save(data)
            const loaded = await repo.load()
            expect(loaded).toEqual(data)
        })

        it('overwrites existing file on subsequent saves', async () => {
            const filePath = join(tempDir, 'rules.json')
            const repo = new JsonGuardrailRulesRepository(filePath)

            await repo.save({ global: { g1: { k: 'approve_always' } }, sessions: {} })
            await repo.save({ global: {}, sessions: {} })

            const loaded = await repo.load()
            expect(loaded).toEqual({ global: {}, sessions: {} })
        })
    })
})
