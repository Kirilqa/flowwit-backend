import { LMStudioMessageRole } from '../LMStudioMessageRole'
import { LMStudioStreamToolCallDeltaResponse } from './LMStudioStreamToolCallDeltaResponse'

export type LMStudioStreamDeltaResponse = {
    role?: LMStudioMessageRole
    content?: string | null
    tool_calls?: Array<LMStudioStreamToolCallDeltaResponse>
}
