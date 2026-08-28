import { OpenAIImageDetailRequest } from './OpenAIImageDetailRequest'

export type OpenAITextContentPartRequest = {
    type: 'text'
    text: string
}

export type OpenAIImageContentPartRequest = {
    type: 'image_url'
    image_url: {
        url: string
        detail?: OpenAIImageDetailRequest
    }
}

export type OpenAIMessageContentPartRequest = OpenAITextContentPartRequest | OpenAIImageContentPartRequest
