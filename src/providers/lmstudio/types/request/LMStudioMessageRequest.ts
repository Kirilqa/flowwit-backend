import { LMStudioMessageContentPartRequest } from './LMStudioMessageContentPartRequest'
import { LMStudioMessageRole } from '../LMStudioMessageRole'
import { LMStudioToolCall } from '../LMStudioToolCall'

export type LMStudioMessageRequest = {
    role: LMStudioMessageRole
    content: string | Array<LMStudioMessageContentPartRequest> | null
    name?: string
    tool_calls?: Array<LMStudioToolCall>
    tool_call_id?: string
}
