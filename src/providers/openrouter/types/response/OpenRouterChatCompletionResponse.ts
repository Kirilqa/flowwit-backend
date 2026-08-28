import { OpenRouterChoiceResponse } from './OpenRouterChoiceResponse'
import { OpenRouterUsageResponse } from './OpenRouterUsageResponse'

export type OpenRouterChatCompletionResponse = {
    id: string
    object: 'chat.completion'
    created: number
    model: string
    choices: Array<OpenRouterChoiceResponse>
    usage: OpenRouterUsageResponse
    system_fingerprint?: string
}
