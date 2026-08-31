export type OllamaTextContentPartRequest = {
    type: 'text'
    text: string
}

export type OllamaImageContentPartRequest = {
    type: 'image_url'
    image_url: {
        url: string
    }
}

export type OllamaMessageContentPartRequest = OllamaTextContentPartRequest | OllamaImageContentPartRequest
