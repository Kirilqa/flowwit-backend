import { randomUUID } from 'crypto'
import { Context } from 'grammy'
import { TelegramCommandInterface } from '../interfaces'
import { TelegramCommandDependencies } from '../types'
import { TelegramChatState } from '../types'

export class StartCommand implements TelegramCommandInterface {
    readonly command = 'start'
    readonly aliases: ReadonlyArray<string> = []

    async handle(
        ctx: Context,
        { agentRegistry, sessionManager, stateRepository }: TelegramCommandDependencies
    ): Promise<void> {
        const chatId = ctx.chat?.id
        if (chatId === undefined) return

        const agents = agentRegistry.list()
        const agent = agents[0]

        if (agent === undefined) {
            await ctx.reply('❌ Нет доступных агентов.')
            return
        }

        const session = await sessionManager.create(randomUUID(), { title: `Telegram:${chatId}:${Date.now()}` })
        const existing = await stateRepository.findByChatId(chatId)
        const sessionIds = existing?.sessionIds ?? []

        const state: TelegramChatState = {
            chatId,
            sessionId: session.id,
            agentId: agent.config.id,
            sessionIds: [...sessionIds, session.id]
        }

        await stateRepository.save(state)
        await sessionManager.save(session)

        await ctx.reply(`👋 Добро пожаловать!\n🤖 Агент: ${agent.config.name}\n🔑 Сессия: ${session.id}`)
    }
}
