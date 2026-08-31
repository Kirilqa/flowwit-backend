import { LMStudioStreamChoiceResponse } from './LMStudioStreamChoiceResponse'
import { LMStudioUsageResponse } from './LMStudioUsageResponse'

export type LMStudioChatCompletionStreamChunkResponse = {
    id: string
    object: 'chat.completion.chunk'
    created: number
    model: string
    choices: Array<LMStudioStreamChoiceResponse>
    usage?: LMStudioUsageResponse | null
}
