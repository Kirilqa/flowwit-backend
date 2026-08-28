import { AgentEvent } from '@agent'
import { AgentSessionBusSubscriberCallback } from './AgentSessionBusSubscriberCallback'

export type AgentSessionBusEntry = {
    buffer: Array<AgentEvent>
    subscribers: Set<AgentSessionBusSubscriberCallback>
    onCompleteCallbacks: Set<() => void>
    completed: boolean
}
