import { readFile, writeFile } from 'fs/promises'
import { ensureJsonFileExists } from '@core/utils'
import { GuardrailRulesRepositoryInterface } from '../interfaces/repositories'
import { GuardrailRulesData } from '../types'

const EMPTY_DATA: GuardrailRulesData = { global: {}, sessions: {} }

export class JsonGuardrailRulesRepository implements GuardrailRulesRepositoryInterface {
    constructor(private readonly filePath: string) {}

    async ensureInitialized(): Promise<void> {
        await ensureJsonFileExists(this.filePath, EMPTY_DATA)
    }

    async load(): Promise<GuardrailRulesData> {
        let raw: string

        try {
            raw = await readFile(this.filePath, 'utf-8')
        } catch {
            return structuredClone(EMPTY_DATA)
        }

        let parsed: unknown

        try {
            parsed = JSON.parse(raw)
        } catch {
            throw new Error(`[JsonGuardrailRulesRepository] Failed to parse JSON file: ${this.filePath}`)
        }

        if (typeof parsed !== 'object' || parsed === null || !('global' in parsed) || !('sessions' in parsed)) {
            return structuredClone(EMPTY_DATA)
        }

        return parsed as GuardrailRulesData
    }

    async save(data: GuardrailRulesData): Promise<void> {
        await writeFile(this.filePath, JSON.stringify(data, null, 4), 'utf-8')
    }
}
