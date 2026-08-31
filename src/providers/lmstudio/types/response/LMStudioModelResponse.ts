import { LMStudioModelCapabilitiesResponse } from './LMStudioModelCapabilitiesResponse'

export const LMSTUDIO_MODEL_TYPE_RESPONSE = {
    LLM: 'llm',
    VLM: 'vlm',
    EMBEDDING: 'embedding'
} as const

export type LMStudioModelTypeResponse = (typeof LMSTUDIO_MODEL_TYPE_RESPONSE)[keyof typeof LMSTUDIO_MODEL_TYPE_RESPONSE]

export type LMStudioModelResponse = {
    type: LMStudioModelTypeResponse
    key: string
    display_name?: string
    publisher?: string
    architecture?: string
    quantization?: {
        name: string
        bits_per_weight: number
    }
    format?: string
    size_bytes?: number
    params_string?: string | null
    max_context_length?: number
    capabilities?: LMStudioModelCapabilitiesResponse
    description?: string | null
}
