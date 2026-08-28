import { OpenAIFinishReasonResponse } from './OpenAIFinishReasonResponse'
import { OpenAIMessageResponse } from './OpenAIMessageResponse'
import { OpenAITokenLogprobResponse } from './OpenAITokenLogprobResponse'

export type OpenAIChoiceResponse = {
    index: number
    message: OpenAIMessageResponse
    finish_reason: OpenAIFinishReasonResponse
    logprobs?: {
        content: Array<OpenAITokenLogprobResponse> | null
    }
}
