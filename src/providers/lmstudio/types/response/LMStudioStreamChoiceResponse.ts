import { LMStudioFinishReasonResponse } from './LMStudioFinishReasonResponse'
import { LMStudioStreamDeltaResponse } from './LMStudioStreamDeltaResponse'

export type LMStudioStreamChoiceResponse = {
    index: number
    delta: LMStudioStreamDeltaResponse
    finish_reason: LMStudioFinishReasonResponse
}
