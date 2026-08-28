import { ModelFamily } from './ModelFamily'
import { ModelFeature } from './ModelFeature'
import { ModelPricing } from './ModelPricing'

export type ModelInfo = {
    id: string
    name: string
    family?: ModelFamily
    contextWindow: number
    maxOutputTokens: number
    maxReasoningTokens?: number
    maxChoicesCount?: number
    features: Array<ModelFeature>
    pricing?: ModelPricing
    deprecated?: boolean
    releaseDate?: string
    description?: string
    providerMetadata?: Record<string, unknown>
}
