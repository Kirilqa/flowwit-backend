import { MessageRole } from '../MessageRole'
import { CONTENT_TYPE } from '../ContentType'

export type TextDelta = {
    type: typeof CONTENT_TYPE.TEXT
    text: string
}

export type ToolCallDelta = {
    type: typeof CONTENT_TYPE.TOOL_CALL
    toolCall: {
        id?: string
        index: number
        function: {
            name?: string
            arguments: string
        }
    }
}

export type ThinkingDelta = {
    type: typeof CONTENT_TYPE.THINKING
    thinking: string
    signature?: string
}

export type MessageContentDelta = TextDelta | ToolCallDelta | ThinkingDelta

export type MessageDelta = {
    role?: MessageRole
    content?: Array<MessageContentDelta>
}
