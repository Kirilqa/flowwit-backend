import { OpenRouterImageDetailRequest } from './OpenRouterImageDetailRequest'

export type OpenRouterTextContentPartRequest = {
    type: 'text'
    text: string
}

export type OpenRouterImageContentPartRequest = {
    type: 'image_url'
    image_url: {
        url: string
        detail?: OpenRouterImageDetailRequest
    }
}

export type OpenRouterMessageContentPartRequest = OpenRouterTextContentPartRequest | OpenRouterImageContentPartRequest
