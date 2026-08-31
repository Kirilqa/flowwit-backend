import { OllamaMessageRole } from '../OllamaMessageRole'
import { OllamaStreamToolCallDeltaResponse } from './OllamaStreamToolCallDeltaResponse'

export type OllamaStreamDeltaResponse = {
    role?: OllamaMessageRole
    content?: string | null
    tool_calls?: Array<OllamaStreamToolCallDeltaResponse>
}
