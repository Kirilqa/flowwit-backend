import { OpenAIStreamChoiceResponse } from './OpenAIStreamChoiceResponse'
import { OpenAIUsageResponse } from './OpenAIUsageResponse'

export type OpenAIChatCompletionStreamChunkResponse = {
    id: string
    object: 'chat.completion.chunk'
    created: number
    model: string
    choices: Array<OpenAIStreamChoiceResponse>
    usage?: OpenAIUsageResponse | null
}
