import { Context } from 'grammy'
import { TelegramCommandInterface } from '../interfaces'
import { TelegramCommandDependencies } from '../types'

export class AgentsCommand implements TelegramCommandInterface {
    readonly command = 'agents'
    readonly aliases: ReadonlyArray<string> = []

    async handle(ctx: Context, { stateRepository, renderAgentsList }: TelegramCommandDependencies): Promise<void> {
        const chatId = ctx.chat?.id
        if (chatId === undefined) return

        const state = await stateRepository.findByChatId(chatId)
        if (state === null) {
            await ctx.reply('❌ Нет активного агента. Используйте /start для начала.')
            return
        }

        await renderAgentsList(ctx, state, 0)
    }
}
