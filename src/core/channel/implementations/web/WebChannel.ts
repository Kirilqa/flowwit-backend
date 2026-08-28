import { randomUUID } from 'crypto'
import { FastifyInstance } from 'fastify'
import { AgentRegistryInterface, AgentEvent, AGENT_EVENT_TYPE } from '@agent'
import { SessionCreateOptions, SessionInterface, SessionManagerInterface } from '@session'
import { CONTENT_TYPE } from '@provider'
import {
    ChannelInterface,
    ChannelMessageHandler,
    ChannelStopHandler,
    ChannelRequest,
    ChannelSettings,
    ChannelSettingSchema,
    ChannelSendOptionSchema,
    ScheduledDeliveryOutcome,
    SCHEDULED_DELIVERY_OUTCOME_TYPE,
    CHANNEL_SETTING_TYPE,
    CHANNEL_SETTING_VISIBILITY
} from '@channel'
import { SSE_EVENT_TYPE } from '@/api/types'
import { mapAgentEventToSseEvent } from '@/api/utils'
import { AgentSessionEventBus } from './AgentSessionEventBus'
import { WebChannelResponse } from './WebChannelResponse'
import { WebChannelSettings, WebSendOptions } from './types'
import { sendMessageBodySchema, sessionParamsSchema } from './validators'

const SCHEDULER_DELIVERY_AGENT_ID = 'scheduler'

export class WebChannel implements ChannelInterface<WebChannelSettings, WebSendOptions> {
    readonly id = 'web'

    private messageHandler: ChannelMessageHandler | null = null
    private stopHandler: ChannelStopHandler | null = null
    private settings: WebChannelSettings = { apiKey: '' }
    private started = false

    constructor(
        private readonly httpServer: FastifyInstance,
        private readonly sessionManager: SessionManagerInterface,
        private readonly agentRegistry: AgentRegistryInterface,
        private readonly agentEventBus: AgentSessionEventBus
    ) {}

    readonly settingsSchema: Array<ChannelSettingSchema<WebChannelSettings>> = [
        {
            key: 'apiKey',
            label: 'API Key',
            type: CHANNEL_SETTING_TYPE.STRING,
            visibility: CHANNEL_SETTING_VISIBILITY.PRIVATE,
            envKey: 'WEB_CHANNEL_API_KEY'
        }
    ]

    readonly sendOptionsSchema: Array<ChannelSendOptionSchema<WebSendOptions>> = [
        {
            key: 'sessionId',
            label: 'Session ID',
            type: CHANNEL_SETTING_TYPE.STRING,
            required: true
        }
    ]

    async resolveSession(options: WebSendOptions): Promise<SessionInterface | null> {
        return this.sessionManager.get(options.sessionId)
    }

    async send(
        outcome: ScheduledDeliveryOutcome,
        destinationSession: SessionInterface,
        _options: WebSendOptions
    ): Promise<void> {
        switch (outcome.type) {
            case SCHEDULED_DELIVERY_OUTCOME_TYPE.SKIP:
                return
            case SCHEDULED_DELIVERY_OUTCOME_TYPE.MESSAGE:
                this.agentEventBus.start(
                    destinationSession.id,
                    this.buildSingleEventStream({
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.MESSAGE,
                        agentId: SCHEDULER_DELIVERY_AGENT_ID,
                        sessionId: destinationSession.id,
                        message: outcome.text,
                        createdAt: Date.now()
                    })
                )
                return
            case SCHEDULED_DELIVERY_OUTCOME_TYPE.ERROR:
                this.agentEventBus.start(
                    destinationSession.id,
                    this.buildSingleEventStream({
                        id: randomUUID(),
                        type: AGENT_EVENT_TYPE.ERROR,
                        agentId: SCHEDULER_DELIVERY_AGENT_ID,
                        sessionId: destinationSession.id,
                        error: outcome.text,
                        recoverable: false,
                        createdAt: Date.now()
                    })
                )
                return
        }
    }

    private async *buildSingleEventStream(event: AgentEvent): AsyncIterable<AgentEvent> {
        yield event
    }

    configure(settings: ChannelSettings): void {
        this.settings = {
            apiKey: String(settings['apiKey'] ?? '')
        }
    }

    onMessage(handler: ChannelMessageHandler): void {
        this.messageHandler = handler
    }

    onStop(handler: ChannelStopHandler): void {
        this.stopHandler = handler
    }

    async start(): Promise<void> {
        if (this.started) return
        this.started = true

        this.httpServer.post('/messages', async (request, reply) => {
            if (this.settings.apiKey) {
                const authHeader = request.headers.authorization ?? ''
                if (authHeader !== `Bearer ${this.settings.apiKey}`) {
                    await reply.status(401).send({ error: 'Unauthorized' })
                    return
                }
            }

            const body = sendMessageBodySchema.safeParse(request.body)

            if (!body.success) {
                await reply.status(400).send({ error: 'Invalid body' })
                return
            }

            const {
                agentId,
                content,
                sessionId: incomingSessionId,
                workingDirectory,
                temporary,
                outputSchema
            } = body.data

            const agent = this.agentRegistry.get(agentId)

            if (!agent) {
                await reply.status(404).send({ error: `Agent "${agentId}" not found` })
                return
            }

            if (incomingSessionId && this.agentEventBus.isActive(incomingSessionId)) {
                await reply.status(409).send({ error: `Session "${incomingSessionId}" is already generating` })
                return
            }

            let sessionId: string
            let sessionTitle: string
            let newSessionOptions: SessionCreateOptions = {}

            if (incomingSessionId) {
                const existingSession = await this.sessionManager.get(incomingSessionId)

                if (!existingSession) {
                    await reply.status(404).send({ error: `Session "${incomingSessionId}" not found` })
                    return
                }

                sessionId = incomingSessionId
                sessionTitle = existingSession.title ?? ''
            } else {
                sessionId = randomUUID()
                sessionTitle = temporary ? '' : await this.generateTitle(agentId, content)
                newSessionOptions = {
                    ...(workingDirectory !== undefined && { workingDirectory }),
                    ...(temporary !== undefined && { temporary })
                }
            }

            const session =
                (await this.sessionManager.get(sessionId)) ??
                (await this.sessionManager.create(sessionId, { title: sessionTitle, ...newSessionOptions }))

            const channelRequest: ChannelRequest = {
                agentId,
                session,
                content,
                ...(outputSchema !== undefined && { outputSchema })
            }
            const channelResponse = new WebChannelResponse(
                reply,
                session,
                sessionTitle,
                this.sessionManager,
                this.agentEventBus
            )

            if (this.messageHandler) {
                await this.messageHandler(channelRequest, channelResponse)
            } else {
                await channelResponse.error('No message handler registered')
            }
        })

        this.httpServer.get('/sessions/:sessionId/events', async (request, reply) => {
            const params = sessionParamsSchema.safeParse(request.params)

            if (!params.success) {
                await reply.status(400).send({ error: 'Invalid params' })
                return
            }

            const { sessionId } = params.data

            if (!this.agentEventBus.isActive(sessionId)) {
                await reply.status(404).send({ error: `No active generation for session "${sessionId}"` })
                return
            }

            const session = await this.sessionManager.get(sessionId)

            if (!session) {
                await reply.status(404).send({ error: `Session "${sessionId}" not found` })
                return
            }

            reply.raw.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
                'X-Accel-Buffering': 'no'
            })

            const writeSse = (event: string, data: unknown): void => {
                reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            }

            writeSse(SSE_EVENT_TYPE.SESSION_CREATED, { id: session.id, title: session.title ?? '' })

            try {
                for await (const agentEvent of this.agentEventBus.subscribe(sessionId)) {
                    const sseEvent = mapAgentEventToSseEvent(agentEvent)

                    if (sseEvent) {
                        writeSse(sseEvent.event, sseEvent.data)
                    }
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unexpected error'
                writeSse(SSE_EVENT_TYPE.ERROR, { message })
            } finally {
                reply.raw.end()
            }
        })

        this.httpServer.delete('/sessions/:sessionId/messages/active', async (request, reply) => {
            const params = sessionParamsSchema.safeParse(request.params)

            if (!params.success) {
                await reply.status(400).send({ error: 'Invalid params' })
                return
            }

            if (this.stopHandler) {
                await this.stopHandler(params.data.sessionId)
            }

            await reply.status(204).send()
        })
    }

    async stop(): Promise<void> {
        this.started = false
    }

    private async generateTitle(agentId: string, firstMessage: string): Promise<string> {
        const agent = this.agentRegistry.get(agentId)

        if (!agent) throw new Error('Invalid agent')

        const { provider, model } = agent.config

        const result = await provider.generate({
            model,
            messages: [
                {
                    role: 'system',
                    content:
                        'Generate a short chat title (max 6 words) based on the user message. The title must be in the same language as the user message. Reply with the title only, no quotes, no punctuation.'
                },
                {
                    role: 'user',
                    content: firstMessage
                }
            ]
        })

        const choice = result.data.choices[0]

        if (!choice) throw new Error('Invalid provider response')

        const content = choice.message.content

        if (typeof content !== 'string') {
            return content[0]?.type === CONTENT_TYPE.TEXT ? content[0].text : 'New chat'
        }

        return content.trim()
    }
}
