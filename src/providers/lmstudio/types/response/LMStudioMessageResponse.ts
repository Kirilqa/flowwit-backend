import { LMStudioToolCall } from '../LMStudioToolCall'

export type LMStudioMessageResponse = {
    role: 'assistant'
    content: string | null
    tool_calls?: Array<LMStudioToolCall>
}
