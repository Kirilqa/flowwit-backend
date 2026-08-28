import { OpenRouterModelArchitectureResponse } from './OpenRouterModelArchitectureResponse'
import { OpenRouterModelPricingResponse } from './OpenRouterModelPricingResponse'
import { OpenRouterModelTopProviderResponse } from './OpenRouterModelTopProviderResponse'

export type OpenRouterModelResponse = {
    id: string
    canonical_slug: string
    name: string
    created: number
    description: string
    context_length: number
    architecture: OpenRouterModelArchitectureResponse
    pricing: OpenRouterModelPricingResponse
    top_provider: OpenRouterModelTopProviderResponse | null
    supported_parameters: Array<string>
    default_parameters: Record<string, unknown> | null
    expiration_date: string | null
}
