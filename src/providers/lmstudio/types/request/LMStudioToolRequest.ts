import { LMStudioFunctionRequest } from './LMStudioFunctionRequest'

export type LMStudioToolRequest = {
    type: 'function'
    function: LMStudioFunctionRequest
}
