import { OllamaStreamChoiceResponse } from './OllamaStreamChoiceResponse'
import { OllamaUsageResponse } from './OllamaUsageResponse'

export type OllamaChatCompletionStreamChunkResponse = {
    id: string
    object: 'chat.completion.chunk'
    created: number
    model: string
    choices: Array<OllamaStreamChoiceResponse>
    usage?: OllamaUsageResponse | null
}
