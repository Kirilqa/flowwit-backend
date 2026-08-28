import { Context } from 'grammy'
import { TelegramCommandInterface } from '../interfaces'
import { TelegramCommandDependencies } from '../types'

export class SessionsCommand implements TelegramCommandInterface {
    readonly command = 'sessions'
    readonly aliases: ReadonlyArray<string> = []

    async handle(ctx: Context, { stateRepository, renderSessionsList }: TelegramCommandDependencies): Promise<void> {
        const chatId = ctx.chat?.id
        if (chatId === undefined) return

        const state = await stateRepository.findByChatId(chatId)
        if (state === null) {
            await ctx.reply('❌ Нет активной сессии. Используйте /start для начала.')
            return
        }

        await renderSessionsList(ctx, state, 0)
    }
}
