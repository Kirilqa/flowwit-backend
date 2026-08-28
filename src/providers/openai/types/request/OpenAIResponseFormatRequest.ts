export type OpenAIResponseFormatTextRequest = {
    type: 'text'
}

export type OpenAIResponseFormatJsonObjectRequest = {
    type: 'json_object'
}

export type OpenAIResponseFormatJsonSchemaRequest = {
    type: 'json_schema'
    json_schema: {
        name: string
        schema: Record<string, unknown>
        strict?: boolean
    }
}

export type OpenAIResponseFormatRequest =
    OpenAIResponseFormatTextRequest | OpenAIResponseFormatJsonObjectRequest | OpenAIResponseFormatJsonSchemaRequest
