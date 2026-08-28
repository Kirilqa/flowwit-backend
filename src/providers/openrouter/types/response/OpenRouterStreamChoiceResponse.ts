import { OpenRouterFinishReasonResponse } from './OpenRouterFinishReasonResponse'
import { OpenRouterStreamDeltaResponse } from './OpenRouterStreamDeltaResponse'
import { OpenRouterTokenLogprobResponse } from './OpenRouterTokenLogprobResponse'

export type OpenRouterStreamChoiceResponse = {
    index: number
    delta: OpenRouterStreamDeltaResponse
    finish_reason: OpenRouterFinishReasonResponse
    logprobs?: {
        content: Array<OpenRouterTokenLogprobResponse> | null
    }
}
