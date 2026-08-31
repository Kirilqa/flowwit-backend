import { OllamaFunctionRequest } from './OllamaFunctionRequest'

export type OllamaToolRequest = {
    type: 'function'
    function: OllamaFunctionRequest
}
