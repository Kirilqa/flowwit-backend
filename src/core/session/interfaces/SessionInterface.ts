import { ProviderInterface, Usage } from '@provider'
import { AgentMessage } from '@agent/types'
import { SessionStatus } from '../types'

export interface SessionInterface {
    readonly id: string
    readonly status: SessionStatus
    readonly title: string | undefined
    readonly usage: Usage
    readonly createdAt: number
    readonly updatedAt: number
    readonly workingDirectory: string | undefined
    readonly contextWindow: number
    readonly temporary: boolean

    getMessages(): Array<AgentMessage>
    addMessage(message: AgentMessage): void
    setMessages(messages: Array<AgentMessage>): void
    commitSession(): void

    setUsage(usage: Usage): void
    setStatus(status: SessionStatus): void
    setTitle(title: string): void
    optimize(contextWindow?: number, provider?: ProviderInterface, model?: string): Promise<void>

    setWorkingDirectory(workingDirectory: string): void
    clearWorkingDirectory(): void
}
