import { OllamaModelDetailsResponse } from './OllamaModelDetailsResponse'

export type OllamaModelResponse = {
    name: string
    model: string
    modified_at: string
    size: number
    digest: string
    details: OllamaModelDetailsResponse
    capabilities: Array<string>
}
