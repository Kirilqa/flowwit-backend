import { OpenRouterCompletionTokensDetailsResponse } from './OpenRouterCompletionTokensDetailsResponse'
import { OpenRouterPromptTokensDetailsResponse } from './OpenRouterPromptTokensDetailsResponse'

export type OpenRouterUsageResponse = {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    prompt_tokens_details?: OpenRouterPromptTokensDetailsResponse
    completion_tokens_details?: OpenRouterCompletionTokensDetailsResponse
    cost?: number
    is_byok?: boolean
}
