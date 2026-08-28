export const RESPONSE_FORMAT_TYPE = {
    TEXT: 'text',
    JSON_OBJECT: 'json_object',
    JSON_SCHEMA: 'json_schema'
} as const

export type ResponseFormatType = (typeof RESPONSE_FORMAT_TYPE)[keyof typeof RESPONSE_FORMAT_TYPE]
