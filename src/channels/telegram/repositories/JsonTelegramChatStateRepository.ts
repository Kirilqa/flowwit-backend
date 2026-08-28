import { readFile, writeFile } from 'fs/promises'
import { ensureJsonFileExists } from '@core/utils'
import { TelegramChatState } from '../types'
import { TelegramChatStateRepositoryInterface } from '../interfaces/repositories'

type TelegramChatStateStore = Record<string, TelegramChatState>

export class JsonTelegramChatStateRepository implements TelegramChatStateRepositoryInterface {
    constructor(private readonly filePath: string) {}

    async ensureInitialized(): Promise<void> {
        await ensureJsonFileExists(this.filePath, {})
    }

    async findByChatId(chatId: number): Promise<TelegramChatState | null> {
        const store = await this.load()
        return store[String(chatId)] ?? null
    }

    async save(state: TelegramChatState): Promise<TelegramChatState> {
        const store = await this.load()
        store[String(state.chatId)] = state
        await this.persist(store)
        return state
    }

    private async load(): Promise<TelegramChatStateStore> {
        let raw: string

        try {
            raw = await readFile(this.filePath, 'utf-8')
        } catch {
            return {}
        }

        try {
            return JSON.parse(raw) as TelegramChatStateStore
        } catch {
            throw new Error(`[JsonTelegramChatStateRepository] Failed to parse JSON file: ${this.filePath}`)
        }
    }

    private async persist(store: TelegramChatStateStore): Promise<void> {
        await writeFile(this.filePath, JSON.stringify(store, null, 4), 'utf-8')
    }
}
