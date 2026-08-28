import { RESPONSE_FORMAT_TYPE } from './ResponseFormatType'

export type ResponseFormatText = {
    type: typeof RESPONSE_FORMAT_TYPE.TEXT
}

export type ResponseFormatJsonObject = {
    type: typeof RESPONSE_FORMAT_TYPE.JSON_OBJECT
}

export type ResponseFormatJsonSchema = {
    type: typeof RESPONSE_FORMAT_TYPE.JSON_SCHEMA
    name: string
    jsonSchema: Record<string, unknown>
}

export type ResponseFormat = ResponseFormatText | ResponseFormatJsonObject | ResponseFormatJsonSchema
