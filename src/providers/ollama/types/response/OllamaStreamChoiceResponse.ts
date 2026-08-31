import { OllamaFinishReasonResponse } from './OllamaFinishReasonResponse'
import { OllamaStreamDeltaResponse } from './OllamaStreamDeltaResponse'

export type OllamaStreamChoiceResponse = {
    index: number
    delta: OllamaStreamDeltaResponse
    finish_reason: OllamaFinishReasonResponse
}
