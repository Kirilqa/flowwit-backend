import { randomUUID } from 'crypto'
import { AGENT_EVENT_TYPE, ErrorEvent } from '@agent'

export function buildErrorEvent(agentId: string, sessionId: string, error: string): ErrorEvent {
    return {
        id: randomUUID(),
        type: AGENT_EVENT_TYPE.ERROR,
        agentId,
        sessionId,
        error,
        recoverable: true,
        createdAt: Date.now()
    }
}
