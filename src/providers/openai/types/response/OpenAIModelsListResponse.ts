import { OpenAIModelResponse } from './OpenAIModelResponse'

export type OpenAIModelsListResponse = {
    object: 'list'
    data: Array<OpenAIModelResponse>
}
