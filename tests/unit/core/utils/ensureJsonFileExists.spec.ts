import { join } from 'path'
import { readFile } from 'fs/promises'
import { ensureJsonFileExists } from '@core/utils'
import { makeTempDir, removeTempDir } from '../../../helpers/tempDir'

describe('ensureJsonFileExists', () => {
    let tempDir: string

    beforeEach(async () => {
        tempDir = await makeTempDir('ensure-json-file-test')
    })

    afterEach(async () => {
        await removeTempDir(tempDir)
    })

    it('creates the file with the default value when it does not exist', async () => {
        const filePath = join(tempDir, 'data.json')

        await ensureJsonFileExists(filePath, { agents: [] })

        const content = await readFile(filePath, 'utf-8')
        expect(JSON.parse(content)).toEqual({ agents: [] })
    })

    it('creates missing parent directories', async () => {
        const filePath = join(tempDir, 'nested', 'config', 'data.json')

        await ensureJsonFileExists(filePath, {})

        const content = await readFile(filePath, 'utf-8')
        expect(JSON.parse(content)).toEqual({})
    })

    it('does not overwrite an existing file', async () => {
        const filePath = join(tempDir, 'data.json')

        await ensureJsonFileExists(filePath, { agents: [] })
        await ensureJsonFileExists(filePath, { agents: [{ id: 'should-not-appear' }] })

        const content = await readFile(filePath, 'utf-8')
        expect(JSON.parse(content)).toEqual({ agents: [] })
    })
})
