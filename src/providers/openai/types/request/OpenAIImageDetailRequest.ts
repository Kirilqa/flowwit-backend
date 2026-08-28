export const OPENAI_IMAGE_DETAIL_REQUEST = {
    LOW: 'low',
    HIGH: 'high',
    AUTO: 'auto'
} as const

export type OpenAIImageDetailRequest = (typeof OPENAI_IMAGE_DETAIL_REQUEST)[keyof typeof OPENAI_IMAGE_DETAIL_REQUEST]
