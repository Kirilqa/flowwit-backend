import { createServer, Server } from 'node:http'
import { URL } from 'node:url'
import { Bot, Context, webhookCallback } from 'grammy'
import { AgentRegistryInterface, AgentInterface } from '@agent'
import { SessionInterface, SessionManagerInterface } from '@session'
import { GuardrailResolverInterface } from '@guardrail'
import {
    ChannelInterface,
    ChannelMessageHandler,
    ChannelRequest,
    ChannelSettingSchema,
    ChannelSendOptionSchema,
    ChannelSettings,
    ChannelStopHandler,
    ScheduledDeliveryOutcome,
    SCHEDULED_DELIVERY_OUTCOME_TYPE,
    CHANNEL_SETTING_TYPE,
    CHANNEL_SETTING_VISIBILITY
} from '@channel'
import { getErrorMessage } from '@core/utils'
import { LoggerInterface } from '@logger'
import { TelegramChannelSettings, TelegramChatState, TelegramSendOptions, TelegramCommandDependencies } from './types'
import { TelegramChatStateRepositoryInterface } from './interfaces/repositories'
import { TelegramCommandInterface } from './interfaces'
import { StartCommand, NewCommand, SessionsCommand, AgentsCommand } from './implementations'
import { TelegramChannelResponse } from './TelegramChannelResponse'
import { isGuardrailDecision, buildPaginatedKeyboard } from './utils'

export class TelegramChannel implements ChannelInterface<TelegramChannelSettings, TelegramSendOptions> {
    readonly id = 'telegram'

    private settings: TelegramChannelSettings = { botToken: '', webhookUrl: '' }
    private bot: Bot | null = null
    private httpServer: Server | null = null
    private messageHandler: ChannelMessageHandler | null = null
    private stopHandler: ChannelStopHandler | null = null
    private readonly activeSessions = new Set<string>()

    private readonly logger: LoggerInterface

    constructor(
        private readonly sessionManager: SessionManagerInterface,
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly guardrailResolver: GuardrailResolverInterface,
        private readonly stateRepository: TelegramChatStateRepositoryInterface,
        logger: LoggerInterface
    ) {
        this.logger = logger.child('TelegramChannel')
    }

    readonly settingsSchema: Array<ChannelSettingSchema<TelegramChannelSettings>> = [
        {
            key: 'botToken',
            label: 'Bot Token',
            type: CHANNEL_SETTING_TYPE.STRING,
            visibility: CHANNEL_SETTING_VISIBILITY.PRIVATE,
            envKey: 'TELEGRAM_BOT_TOKEN',
            required: true
        },
        {
            key: 'webhookUrl',
            label: 'Webhook URL',
            type: CHANNEL_SETTING_TYPE.STRING,
            visibility: CHANNEL_SETTING_VISIBILITY.PUBLIC,
            envKey: 'TELEGRAM_WEBHOOK_URL'
        }
    ]

    readonly sendOptionsSchema: Array<ChannelSendOptionSchema<TelegramSendOptions>> = [
        {
            key: 'chatId',
            label: 'Chat ID',
            type: CHANNEL_SETTING_TYPE.NUMBER,
            required: true
        }
    ]

    async resolveSession(options: TelegramSendOptions): Promise<SessionInterface | null> {
        const state = await this.stateRepository.findByChatId(options.chatId)

        if (state?.sessionId == null) return null

        return this.sessionManager.get(state.sessionId)
    }

    async send(
        outcome: ScheduledDeliveryOutcome,
        _destinationSession: SessionInterface,
        options: TelegramSendOptions
    ): Promise<void> {
        if (this.bot === null) {
            throw new Error('Telegram channel is not started')
        }

        switch (outcome.type) {
            case SCHEDULED_DELIVERY_OUTCOME_TYPE.SKIP:
                return
            case SCHEDULED_DELIVERY_OUTCOME_TYPE.MESSAGE:
                await this.bot.api.sendMessage(options.chatId, outcome.text, { parse_mode: 'Markdown' })
                return
            case SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR:
                await this.bot.api.sendMessage(options.chatId, `❌ Ошибка: ${outcome.text}`)
                return
        }
    }

    configure(settings: ChannelSettings): void {
        this.settings = {
            botToken: typeof settings['botToken'] === 'string' ? settings['botToken'] : '',
            webhookUrl: typeof settings['webhookUrl'] === 'string' ? settings['webhookUrl'] : ''
        }
    }

    onMessage(handler: ChannelMessageHandler): void {
        this.messageHandler = handler
    }

    onStop(handler: ChannelStopHandler): void {
        this.stopHandler = handler
    }

    async start(): Promise<void> {
        if (!this.settings.botToken) return

        const bot = new Bot(this.settings.botToken)
        this.bot = bot

        const dependencies = this.buildDependencies()
        const commands = this.buildCommands()

        for (const cmd of commands) {
            const handler = (ctx: Context): void => {
                cmd.handle(ctx, dependencies).catch((error: unknown) => {
                    this.logger.error(`/${cmd.command} error`, { command: cmd.command, error: getErrorMessage(error) })
                })
            }
            bot.command(cmd.command, handler)
            for (const alias of cmd.aliases) {
                bot.command(alias, handler)
            }
        }

        bot.on('message:text', ctx => {
            this.handleTextMessage(ctx).catch((error: unknown) => {
                this.logger.error('Message handler error', { error: getErrorMessage(error) })
            })
        })
        bot.on('callback_query:data', ctx => this.handleCallbackQuery(ctx))

        bot.catch(error => {
            this.logger.error('Unhandled bot error', { error: getErrorMessage(error) })
        })

        if (this.settings.webhookUrl) {
            await this.startWebhook(bot, this.settings.webhookUrl)
        } else {
            void bot.start()
        }
    }

    async stop(): Promise<void> {
        for (const sessionId of this.activeSessions) {
            if (this.stopHandler !== null) {
                await this.stopHandler(sessionId)
            }
        }

        if (this.httpServer !== null) {
            const server = this.httpServer
            await new Promise<void>(resolve => {
                server.close(() => {
                    resolve()
                })
            })
            this.httpServer = null
        }

        if (this.bot !== null) {
            await this.bot.stop()
            this.bot = null
        }
    }

    private buildCommands(): ReadonlyArray<TelegramCommandInterface> {
        return [new StartCommand(), new NewCommand(), new SessionsCommand(), new AgentsCommand()]
    }

    private buildDependencies(): TelegramCommandDependencies {
        return {
            agentRegistry: this.agentRegistry,
            sessionManager: this.sessionManager,
            stateRepository: this.stateRepository,
            renderSessionsList: (ctx, state, page) => this.renderSessionsList(ctx, state, page),
            renderAgentsList: (ctx, state, page) => this.renderAgentsList(ctx, state, page)
        }
    }

    private async startWebhook(bot: Bot, webhookUrl: string): Promise<void> {
        const parsedUrl = new URL(webhookUrl)
        const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 443
        const path = parsedUrl.pathname

        await bot.api.setWebhook(webhookUrl)

        const handler = webhookCallback(bot, 'http')
        const server = createServer((req, res) => {
            if (req.url === path) {
                void handler(req, res)
            }
        })

        server.listen(port)
        this.httpServer = server
    }

    private async handleTextMessage(ctx: Context): Promise<void> {
        const chatId = ctx.chat?.id
        const text = ctx.message?.text
        if (chatId === undefined || text === undefined) return

        const state = await this.stateRepository.findByChatId(chatId)
        if (state?.sessionId == null || state.agentId === null) {
            await ctx.reply('❌ Нет активной сессии. Используйте /start для начала.')
            return
        }

        const session = await this.sessionManager.get(state.sessionId)
        if (session === null) {
            await ctx.reply('❌ Сессия не найдена. Используйте /start для начала.')
            return
        }

        const request: ChannelRequest = {
            agentId: state.agentId,
            session,
            content: text
        }

        const response = new TelegramChannelResponse(ctx.api, chatId, session, this.sessionManager)

        if (this.messageHandler !== null) {
            this.activeSessions.add(session.id)
            await ctx.api.sendChatAction(chatId, 'typing')
            const typingInterval = setInterval(() => {
                void ctx.api.sendChatAction(chatId, 'typing')
            }, 4000)
            try {
                await this.messageHandler(request, response)
            } finally {
                clearInterval(typingInterval)
                this.activeSessions.delete(session.id)
            }
        }
    }

    private async handleCallbackQuery(ctx: Context): Promise<void> {
        const data = ctx.callbackQuery?.data
        if (data === undefined) return

        await ctx.answerCallbackQuery()

        if (data.startsWith('guardrail:')) {
            await this.handleGuardrailCallback(ctx, data)
        } else if (data.startsWith('sessions:')) {
            await this.handleSessionsCallback(ctx, data)
        } else if (data.startsWith('agents:')) {
            await this.handleAgentsCallback(ctx, data)
        }
    }

    private async handleGuardrailCallback(ctx: Context, data: string): Promise<void> {
        const colonAfterPrefix = data.indexOf(':', 'guardrail:'.length)
        if (colonAfterPrefix === -1) return

        const requestId = data.slice('guardrail:'.length, colonAfterPrefix)
        const decisionStr = data.slice(colonAfterPrefix + 1)

        if (!requestId || !isGuardrailDecision(decisionStr)) return

        this.guardrailResolver.resolve(requestId, decisionStr)

        try {
            await ctx.deleteMessage()
        } catch {}
    }

    private async handleSessionsCallback(ctx: Context, data: string): Promise<void> {
        const chatId = ctx.chat?.id
        if (chatId === undefined) return

        const state = await this.stateRepository.findByChatId(chatId)
        if (state === null) return

        const parts = data.split(':')
        const action = parts[1]

        if (action === 'page') {
            const pageStr = parts[2]
            if (pageStr === undefined) return
            const page = parseInt(pageStr, 10)
            if (isNaN(page)) return
            await this.renderSessionsList(ctx, state, page)
        } else if (action === 'select') {
            const sessionId = parts[2]
            if (sessionId === undefined || !state.sessionIds.includes(sessionId)) return

            const session = await this.sessionManager.get(sessionId)
            if (session === null) return

            await this.stateRepository.save({ ...state, sessionId })
            await ctx.editMessageText(`✅ Сессия переключена: ${session.title ?? sessionId}`)
        }
    }

    private async handleAgentsCallback(ctx: Context, data: string): Promise<void> {
        const chatId = ctx.chat?.id
        if (chatId === undefined) return

        const state = await this.stateRepository.findByChatId(chatId)
        if (state === null) return

        const parts = data.split(':')
        const action = parts[1]

        if (action === 'page') {
            const pageStr = parts[2]
            if (pageStr === undefined) return
            const page = parseInt(pageStr, 10)
            if (isNaN(page)) return
            await this.renderAgentsList(ctx, state, page)
        } else if (action === 'select') {
            const agentId = parts[2]
            if (agentId === undefined) return

            const agent = this.agentRegistry.get(agentId)
            if (agent === null) return

            await this.stateRepository.save({ ...state, agentId })
            await ctx.editMessageText(`✅ Агент переключён: ${agent.config.name}`)
        }
    }

    private async renderSessionsList(ctx: Context, state: TelegramChatState, page: number): Promise<void> {
        const sessionPromises = state.sessionIds.map(id => this.sessionManager.get(id))
        const maybeSessionsList = await Promise.all(sessionPromises)
        const sessions = maybeSessionsList.filter((s): s is SessionInterface => s !== null)

        if (sessions.length === 0) {
            const text = '📋 Нет сессий.'
            if (ctx.callbackQuery !== undefined) {
                await ctx.editMessageText(text)
            } else {
                await ctx.reply(text)
            }
            return
        }

        const keyboard = buildPaginatedKeyboard(
            sessions,
            page,
            'sessions',
            session => {
                const isActive = session.id === state.sessionId
                const label = session.title ?? session.id.slice(0, 8)
                return isActive ? `✅ ${label}` : label
            },
            session => `sessions:select:${session.id}`
        )

        const text = `📋 Сессии (страница ${page + 1}):`

        if (ctx.callbackQuery !== undefined) {
            await ctx.editMessageText(text, { reply_markup: keyboard })
        } else {
            await ctx.reply(text, { reply_markup: keyboard })
        }
    }

    private async renderAgentsList(ctx: Context, state: TelegramChatState, page: number): Promise<void> {
        const agents = this.agentRegistry.list()

        if (agents.length === 0) {
            const text = '🤖 Нет агентов.'
            if (ctx.callbackQuery !== undefined) {
                await ctx.editMessageText(text)
            } else {
                await ctx.reply(text)
            }
            return
        }

        const keyboard = buildPaginatedKeyboard(
            agents,
            page,
            'agents',
            (agent: AgentInterface) => {
                const isActive = agent.config.id === state.agentId
                return isActive ? `✅ ${agent.config.name}` : agent.config.name
            },
            (agent: AgentInterface) => `agents:select:${agent.config.id}`
        )

        const text = `🤖 Агенты (страница ${page + 1}):`

        if (ctx.callbackQuery !== undefined) {
            await ctx.editMessageText(text, { reply_markup: keyboard })
        } else {
            await ctx.reply(text, { reply_markup: keyboard })
        }
    }
}
