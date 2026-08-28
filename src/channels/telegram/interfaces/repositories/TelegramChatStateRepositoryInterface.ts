import { InitializableInterface } from '@core/interfaces'
import { TelegramChatState } from '../../types'

export interface TelegramChatStateRepositoryInterface extends InitializableInterface {
    findByChatId(chatId: number): Promise<TelegramChatState | null>
    save(state: TelegramChatState): Promise<TelegramChatState>
}
