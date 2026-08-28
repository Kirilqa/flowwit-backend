import { OpenAIChoiceResponse } from './OpenAIChoiceResponse'
import { OpenAIUsageResponse } from './OpenAIUsageResponse'

export type OpenAIChatCompletionResponse = {
    id: string
    object: 'chat.completion'
    created: number
    model: string
    choices: Array<OpenAIChoiceResponse>
    usage: OpenAIUsageResponse
    system_fingerprint?: string
}
