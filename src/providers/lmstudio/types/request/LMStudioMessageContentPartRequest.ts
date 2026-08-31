export type LMStudioTextContentPartRequest = {
    type: 'text'
    text: string
}

export type LMStudioImageContentPartRequest = {
    type: 'image_url'
    image_url: {
        url: string
    }
}

export type LMStudioMessageContentPartRequest = LMStudioTextContentPartRequest | LMStudioImageContentPartRequest
