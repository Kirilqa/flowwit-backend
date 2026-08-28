import { randomUUID } from 'crypto'
import { Context } from 'grammy'
import { TelegramCommandInterface } from '../interfaces'
import { TelegramCommandDependencies } from '../types'
import { TelegramChatState } from '../types'

export class NewCommand implements TelegramCommandInterface {
    readonly command = 'new'
    readonly aliases: ReadonlyArray<string> = []

    async handle(ctx: Context, { sessionManager, stateRepository }: TelegramCommandDependencies): Promise<void> {
        const chatId = ctx.chat?.id
        if (chatId === undefined) return

        const existing = await stateRepository.findByChatId(chatId)
        if (existing?.agentId == null) {
            await ctx.reply('❌ Нет активного агента. Используйте /start для начала.')
            return
        }

        const session = await sessionManager.create(randomUUID(), { title: `Telegram:${chatId}:${Date.now()}` })

        const state: TelegramChatState = {
            chatId,
            sessionId: session.id,
            agentId: existing.agentId,
            sessionIds: [...existing.sessionIds, session.id]
        }

        await stateRepository.save(state)
        await sessionManager.save(session)

        await ctx.reply('🆕 Новая сессия')
    }
}
