import { LMStudioChoiceResponse } from './LMStudioChoiceResponse'
import { LMStudioUsageResponse } from './LMStudioUsageResponse'

export type LMStudioChatCompletionResponse = {
    id: string
    object: 'chat.completion'
    created: number
    model: string
    choices: Array<LMStudioChoiceResponse>
    usage: LMStudioUsageResponse
    system_fingerprint?: string
}
