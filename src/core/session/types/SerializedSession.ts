import { Usage } from '@provider'
import { AgentMessage } from '@agent/types'
import { SessionStatus } from './SessionStatus'

export type SerializedSession = {
    id: string
    status: SessionStatus
    title: string | undefined
    usage: Usage
    createdAt: number
    updatedAt: number
    contextWindow: number
    workingDirectory: string | undefined
    messages: Array<AgentMessage>
}
