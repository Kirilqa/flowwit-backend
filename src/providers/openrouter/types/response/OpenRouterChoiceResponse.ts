import { OpenRouterFinishReasonResponse } from './OpenRouterFinishReasonResponse'
import { OpenRouterMessageResponse } from './OpenRouterMessageResponse'
import { OpenRouterTokenLogprobResponse } from './OpenRouterTokenLogprobResponse'

export type OpenRouterChoiceResponse = {
    index: number
    message: OpenRouterMessageResponse
    finish_reason: OpenRouterFinishReasonResponse
    logprobs?: {
        content: Array<OpenRouterTokenLogprobResponse> | null
    }
}
