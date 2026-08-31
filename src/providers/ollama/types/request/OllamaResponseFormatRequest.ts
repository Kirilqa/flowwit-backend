export type OllamaResponseFormatTextRequest = {
    type: 'text'
}

export type OllamaResponseFormatJsonObjectRequest = {
    type: 'json_object'
}

export type OllamaResponseFormatJsonSchemaRequest = {
    type: 'json_schema'
    json_schema: {
        name: string
        schema: Record<string, unknown>
        strict?: boolean
    }
}

export type OllamaResponseFormatRequest =
    OllamaResponseFormatTextRequest | OllamaResponseFormatJsonObjectRequest | OllamaResponseFormatJsonSchemaRequest
