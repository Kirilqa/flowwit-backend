export type OllamaModelDetailsResponse = {
    parent_model?: string
    format?: string
    family?: string
    families?: Array<string> | null
    parameter_size?: string
    quantization_level?: string
    context_length?: number
    embedding_length?: number
}
