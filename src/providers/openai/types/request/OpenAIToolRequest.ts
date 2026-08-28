import { OpenAIFunctionRequest } from './OpenAIFunctionRequest'

export type OpenAIToolRequest = {
    type: 'function'
    function: OpenAIFunctionRequest
}
