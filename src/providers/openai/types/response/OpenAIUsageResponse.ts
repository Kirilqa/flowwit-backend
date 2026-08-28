import { OpenAICompletionTokensDetailsResponse } from './OpenAICompletionTokensDetailsResponse'
import { OpenAIPromptTokensDetailsResponse } from './OpenAIPromptTokensDetailsResponse'

export type OpenAIUsageResponse = {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    prompt_tokens_details?: OpenAIPromptTokensDetailsResponse
    completion_tokens_details?: OpenAICompletionTokensDetailsResponse
}
