export const OPENROUTER_IMAGE_DETAIL_REQUEST = {
    LOW: 'low',
    HIGH: 'high',
    AUTO: 'auto'
} as const

export type OpenRouterImageDetailRequest =
    (typeof OPENROUTER_IMAGE_DETAIL_REQUEST)[keyof typeof OPENROUTER_IMAGE_DETAIL_REQUEST]
