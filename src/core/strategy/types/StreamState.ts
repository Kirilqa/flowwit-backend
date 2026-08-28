export const STREAM_STATE = {
    IDLE: 'idle',
    THINKING: 'thinking',
    MESSAGE: 'message',
    TOOL_CALL: 'tool_call'
} as const

export type StreamState = (typeof STREAM_STATE)[keyof typeof STREAM_STATE]
