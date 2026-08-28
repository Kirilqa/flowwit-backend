export const CONTENT_TYPE = {
    TEXT: 'text',
    IMAGE_URL: 'image_url',
    VIDEO_URL: 'video_url',
    AUDIO_URL: 'audio_url',
    FILE_URL: 'file_url',
    TOOL_CALL: 'tool_call',
    TOOL_RESULT: 'tool_result',
    THINKING: 'thinking'
} as const

export type ContentType = (typeof CONTENT_TYPE)[keyof typeof CONTENT_TYPE]
