import { OpenRouterStreamChoiceResponse } from './OpenRouterStreamChoiceResponse'
import { OpenRouterUsageResponse } from './OpenRouterUsageResponse'

export type OpenRouterChatCompletionStreamChunkResponse = {
    id: string
    object: 'chat.completion.chunk'
    created: number
    model: string
    choices: Array<OpenRouterStreamChoiceResponse>
    usage?: OpenRouterUsageResponse | null
}
