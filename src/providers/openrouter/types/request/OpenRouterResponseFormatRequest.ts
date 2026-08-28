export type OpenRouterResponseFormatTextRequest = {
    type: 'text'
}

export type OpenRouterResponseFormatJsonObjectRequest = {
    type: 'json_object'
}

export type OpenRouterResponseFormatJsonSchemaRequest = {
    type: 'json_schema'
    json_schema: {
        name: string
        schema: Record<string, unknown>
        strict?: boolean
    }
}

export type OpenRouterResponseFormatRequest =
    | OpenRouterResponseFormatTextRequest
    | OpenRouterResponseFormatJsonObjectRequest
    | OpenRouterResponseFormatJsonSchemaRequest
