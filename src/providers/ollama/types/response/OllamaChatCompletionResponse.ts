import { OllamaChoiceResponse } from './OllamaChoiceResponse'
import { OllamaUsageResponse } from './OllamaUsageResponse'

export type OllamaChatCompletionResponse = {
    id: string
    object: 'chat.completion'
    created: number
    model: string
    choices: Array<OllamaChoiceResponse>
    usage: OllamaUsageResponse
    system_fingerprint?: string
}
