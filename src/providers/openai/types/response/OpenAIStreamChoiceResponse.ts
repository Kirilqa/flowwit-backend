import { OpenAIFinishReasonResponse } from './OpenAIFinishReasonResponse'
import { OpenAIStreamDeltaResponse } from './OpenAIStreamDeltaResponse'
import { OpenAITokenLogprobResponse } from './OpenAITokenLogprobResponse'

export type OpenAIStreamChoiceResponse = {
    index: number
    delta: OpenAIStreamDeltaResponse
    finish_reason: OpenAIFinishReasonResponse
    logprobs?: {
        content: Array<OpenAITokenLogprobResponse> | null
    }
}
