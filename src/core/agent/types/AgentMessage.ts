import { MessageContentPart, MessageRole } from '@provider'

export type AgentMessage = {
    id: string
    role: MessageRole
    content: string | Array<MessageContentPart>
    createdAt: number
    metadata?: Record<string, unknown>
}
