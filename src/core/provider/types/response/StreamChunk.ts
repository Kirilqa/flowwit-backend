import { FinishReason } from './FinishReason'
import { MessageDelta } from './MessageDelta'
import { Usage } from './Usage'

export type StreamChunkDelta = {
    state: 'streaming'
    delta: MessageDelta
}

export type StreamChunkFinal = {
    state: 'done'
    usage?: Usage
    finishReason: FinishReason
}

export type StreamChunk = StreamChunkDelta | StreamChunkFinal
