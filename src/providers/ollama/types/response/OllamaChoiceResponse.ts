import { OllamaFinishReasonResponse } from './OllamaFinishReasonResponse'
import { OllamaMessageResponse } from './OllamaMessageResponse'

export type OllamaChoiceResponse = {
    index: number
    message: OllamaMessageResponse
    finish_reason: OllamaFinishReasonResponse
}
