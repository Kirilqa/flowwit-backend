import { LMStudioFinishReasonResponse } from './LMStudioFinishReasonResponse'
import { LMStudioMessageResponse } from './LMStudioMessageResponse'

export type LMStudioChoiceResponse = {
    index: number
    message: LMStudioMessageResponse
    finish_reason: LMStudioFinishReasonResponse
}
