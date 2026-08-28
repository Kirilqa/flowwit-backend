import { CONTENT_TYPE, MessageContentPart, ProviderInterface, Usage } from '@provider'
import { AgentMessage } from '@agent/types'
import { SessionInterface } from '../../interfaces'
import { SessionOptimizerInterface } from '../../optimizers'
import { SESSION_STATUS, SessionStatus } from '../../types'
import { SessionCreateOptions } from '../../types/SessionCreateOptions'

export class Session implements SessionInterface {
    readonly id: string
    readonly contextWindow: number
    readonly createdAt: number
    readonly temporary: boolean

    private _status: SessionStatus
    private _title: string | undefined
    private _usage: Usage
    private _updatedAt: number
    private _messages: Array<AgentMessage> = []
    private _workingDirectory: string | undefined

    private readonly optimizers: Array<SessionOptimizerInterface>

    get workingDirectory(): string | undefined {
        return this._workingDirectory
    }

    constructor(id: string, optimizers: Array<SessionOptimizerInterface> = [], options: SessionCreateOptions = {}) {
        this.id = id
        this.contextWindow = options.contextWindow ?? 1_000_000
        this.createdAt = options.createdAt ?? Date.now()
        this.temporary = options.temporary ?? false
        this._updatedAt = this.createdAt
        this._status = SESSION_STATUS.IDLE
        this._title = options.title
        this._workingDirectory = options.workingDirectory
        this._usage = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
        }
        this.optimizers = optimizers
    }

    get status(): SessionStatus {
        return this._status
    }

    get title(): string | undefined {
        return this._title
    }

    get usage(): Usage {
        return this._usage
    }

    get updatedAt(): number {
        return this._updatedAt
    }

    getMessages(): Array<AgentMessage> {
        return [...this._messages]
    }

    addMessage(message: AgentMessage): void {
        this._messages.push({
            ...message,
            metadata: { ...message.metadata, currentSession: true }
        })
        this.touch()
    }

    setMessages(messages: Array<AgentMessage>): void {
        this._messages = [...messages]
        this.touch()
    }

    commitSession(): void {
        this._messages = this.stripOrphanedToolCalls(this._messages).map(message => {
            if (!message.metadata?.['currentSession']) return message

            const { currentSession: _, ...restMetadata } = message.metadata

            if (Object.keys(restMetadata).length === 0) {
                const { metadata: _, ...messageWithoutMetadata } = message
                return messageWithoutMetadata
            }

            return { ...message, metadata: restMetadata }
        })
        this.touch()
    }

    setUsage(usage: Usage): void {
        this._usage = usage
        this.touch()
    }

    setStatus(status: SessionStatus): void {
        this._status = status
        this.touch()
    }

    setTitle(title: string): void {
        this._title = title
        this.touch()
    }

    async optimize(contextWindow?: number, provider?: ProviderInterface, model?: string): Promise<void> {
        let messages = this.getMessages()
        for (const optimizer of this.optimizers) {
            messages = await optimizer.optimize(
                messages,
                this.usage,
                Math.min(this.contextWindow, contextWindow ?? this.contextWindow),
                provider,
                model
            )
        }
        this.setMessages(messages)
    }

    setWorkingDirectory(workingDirectory: string): void {
        this._workingDirectory = workingDirectory
        this.touch()
    }

    clearWorkingDirectory(): void {
        this._workingDirectory = undefined
        this.touch()
    }

    private stripOrphanedToolCalls(messages: Array<AgentMessage>): Array<AgentMessage> {
        const resolvedToolResultIds = new Set<string>()

        for (const message of messages) {
            if (typeof message.content === 'string') continue

            for (const part of message.content) {
                if (part.type === CONTENT_TYPE.TOOL_RESULT) {
                    resolvedToolResultIds.add(part.toolResult.id)
                }
            }
        }

        return messages.filter(message => {
            if (typeof message.content === 'string') return true

            const toolCallIds = message.content
                .filter(
                    (part): part is Extract<MessageContentPart, { type: typeof CONTENT_TYPE.TOOL_CALL }> =>
                        part.type === CONTENT_TYPE.TOOL_CALL
                )
                .map(part => part.toolCall.id)

            if (toolCallIds.length === 0) return true

            return toolCallIds.every(id => resolvedToolResultIds.has(id))
        })
    }

    private touch(): void {
        this._updatedAt = Date.now()
    }
}
