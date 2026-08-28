import { CONTENT_TYPE, ContentType } from './ContentType'

export type BaseContent = {
    type: ContentType
}

export type TextContent = BaseContent & {
    type: typeof CONTENT_TYPE.TEXT
    text: string
}

export type ImageContent = BaseContent & {
    type: typeof CONTENT_TYPE.IMAGE_URL
    url: string
    mimeType?: string
    data?: string | ArrayBuffer | Buffer
}

export type VideoContent = BaseContent & {
    type: typeof CONTENT_TYPE.VIDEO_URL
    url: string
    mimeType?: string
    data?: string | ArrayBuffer | Buffer
}

export type AudioContent = BaseContent & {
    type: typeof CONTENT_TYPE.AUDIO_URL
    url: string
    mimeType?: string
    data?: string | ArrayBuffer | Buffer
}

export type FileContent = BaseContent & {
    type: typeof CONTENT_TYPE.FILE_URL
    url: string
    mimeType?: string
    data?: string | ArrayBuffer | Buffer
}

export type ToolCallContent = BaseContent & {
    type: typeof CONTENT_TYPE.TOOL_CALL
    toolCall: {
        id: string
        function: {
            name: string
            arguments: string
        }
    }
}

export type ToolResultContent = BaseContent & {
    type: typeof CONTENT_TYPE.TOOL_RESULT
    toolResult: {
        id: string
        content: string
        isError?: boolean
    }
}

export type ThinkingContent = BaseContent & {
    type: typeof CONTENT_TYPE.THINKING
    thinking: string
    signature?: string
}

export type MessageContentPart =
    | TextContent
    | ImageContent
    | VideoContent
    | AudioContent
    | FileContent
    | ToolCallContent
    | ToolResultContent
    | ThinkingContent
