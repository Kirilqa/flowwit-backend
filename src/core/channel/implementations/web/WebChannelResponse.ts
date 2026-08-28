import { FastifyReply } from 'fastify'
import { AgentEvent } from '@agent'
import { SessionInterface, SessionManagerInterface } from '@session'
import { ChannelResponseInterface } from '@channel'
import { SSE_EVENT_TYPE } from '@/api/types'
import { mapAgentEventToSseEvent } from '@/api/utils'
import { AgentSessionEventBus } from './AgentSessionEventBus'

export class WebChannelResponse implements ChannelResponseInterface {
    constructor(
        private readonly reply: FastifyReply,
        private readonly session: SessionInterface,
        private readonly sessionTitle: string,
        private readonly sessionManager: SessionManagerInterface,
        private readonly eventBus: AgentSessionEventBus
    ) {}

    async stream(events: AsyncIterable<AgentEvent>): Promise<void> {
        this.reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no'
        })

        const writeSse = (event: string, data: unknown): void => {
            this.reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        }

        writeSse(SSE_EVENT_TYPE.SESSION_CREATED, { id: this.session.id, title: this.sessionTitle })

        this.eventBus.start(this.session.id, events)

        try {
            for await (const agentEvent of this.eventBus.subscribe(this.session.id)) {
                const sseEvent = mapAgentEventToSseEvent(agentEvent)

                if (sseEvent) {
                    writeSse(sseEvent.event, sseEvent.data)
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unexpected error'
            writeSse(SSE_EVENT_TYPE.ERROR, { message })
        } finally {
            if (this.session.temporary) {
                await this.sessionManager.delete(this.session.id)
            } else {
                await this.sessionManager.save(this.session)
            }

            this.reply.raw.end()
        }
    }

    async error(message: string): Promise<void> {
        this.reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no'
        })

        this.reply.raw.write(`event: ${SSE_EVENT_TYPE.ERROR}\ndata: ${JSON.stringify({ message })}\n\n`)
        this.reply.raw.end()
    }
}
