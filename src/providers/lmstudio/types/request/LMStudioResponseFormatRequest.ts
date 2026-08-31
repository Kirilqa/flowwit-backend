export type LMStudioResponseFormatTextRequest = {
    type: 'text'
}

export type LMStudioResponseFormatJsonObjectRequest = {
    type: 'json_object'
}

export type LMStudioResponseFormatJsonSchemaRequest = {
    type: 'json_schema'
    json_schema: {
        name: string
        schema: Record<string, unknown>
        strict?: boolean
    }
}

export type LMStudioResponseFormatRequest =
    | LMStudioResponseFormatTextRequest
    | LMStudioResponseFormatJsonObjectRequest
    | LMStudioResponseFormatJsonSchemaRequest
