import { ModelFeature, ModelPricing } from '@provider/types'

export type OpenAIModelDefinition = {
    contextWindow: number
    maxOutputTokens: number
    maxReasoningTokens?: number
    maxChoicesCount?: number
    features: Array<ModelFeature>
    pricing?: ModelPricing
    releaseDate?: string
    deprecated?: boolean
    description?: string
}
