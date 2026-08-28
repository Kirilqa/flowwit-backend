import { MODEL_FAMILY, MODEL_FEATURE, ModelFamily, ModelFeature, ModelInfo, ModelPricing } from '@provider'
import { OpenRouterModelResponse, OpenRouterModelPricingResponse } from '../types'

const resolveModelFamily = (modelId: string): ModelFamily => {
    const prefix = modelId.split('/')[0]

    switch (prefix) {
        case 'openai':
            return MODEL_FAMILY.GPT
        case 'anthropic':
            return MODEL_FAMILY.CLAUDE
        case 'google':
            return MODEL_FAMILY.GEMINI
        case 'meta-llama':
            return MODEL_FAMILY.LLAMA
        case 'mistralai':
            return MODEL_FAMILY.MISTRAL
        case 'qwen':
            return MODEL_FAMILY.QWEN
        case 'deepseek':
            return MODEL_FAMILY.DEEPSEEK
        case 'minimax':
            return MODEL_FAMILY.MINIMAX
        case 'moonshot':
            return MODEL_FAMILY.KIMI
        case 'xiaomi':
            return MODEL_FAMILY.MIMO
        case 'openrouter':
            return MODEL_FAMILY.OPENROUTER
        default:
            return MODEL_FAMILY.CUSTOM
    }
}

const resolveFeatures = (
    supportedParameters: Array<string>,
    inputModalities: Array<string>,
    pricing: OpenRouterModelPricingResponse
): Array<ModelFeature> => {
    const features: Array<ModelFeature> = [MODEL_FEATURE.STREAMING]

    if (supportedParameters.includes('tools')) {
        features.push(MODEL_FEATURE.TOOLS)
    }

    if (inputModalities.includes('image')) {
        features.push(MODEL_FEATURE.VISION)
    }

    if (inputModalities.includes('audio')) {
        features.push(MODEL_FEATURE.AUDIO)
    }

    if (inputModalities.includes('video')) {
        features.push(MODEL_FEATURE.VIDEO)
    }

    if (supportedParameters.includes('response_format')) {
        features.push(MODEL_FEATURE.JSON_MODE)
    }

    if (supportedParameters.includes('structured_outputs')) {
        features.push(MODEL_FEATURE.JSON_SCHEMA)
        features.push(MODEL_FEATURE.STRICT_SCHEMA)
    }

    if (supportedParameters.includes('tool_choice')) {
        features.push(MODEL_FEATURE.PARALLEL_TOOL_CALLS)
    }

    if (supportedParameters.includes('reasoning') || supportedParameters.includes('include_reasoning')) {
        features.push(MODEL_FEATURE.REASONING)
    }

    if (supportedParameters.includes('seed')) {
        features.push(MODEL_FEATURE.SEED)
    }

    if (supportedParameters.includes('logprobs') || supportedParameters.includes('top_logprobs')) {
        features.push(MODEL_FEATURE.LOGPROBS)
    }

    if (supportedParameters.includes('n')) {
        features.push(MODEL_FEATURE.MULTIPLE_CHOICES)
    }

    const cacheReadPer1K = parseFloat(pricing.input_cache_read ?? '0') * 1000
    const cacheWritePer1K = parseFloat(pricing.input_cache_write ?? '0') * 1000

    if (cacheReadPer1K > 0 || cacheWritePer1K > 0) {
        features.push(MODEL_FEATURE.CACHING)
    }

    return features
}

const resolvePricing = (pricing: OpenRouterModelPricingResponse): ModelPricing | undefined => {
    const inputPer1K = parseFloat(pricing.prompt) * 1000
    const outputPer1K = parseFloat(pricing.completion) * 1000

    if (isNaN(inputPer1K) || isNaN(outputPer1K)) {
        return undefined
    }

    const cacheReadPer1K = parseFloat(pricing.input_cache_read ?? '0') * 1000
    const cacheWritePer1K = parseFloat(pricing.input_cache_write ?? '0') * 1000
    const reasoningPer1K = parseFloat(pricing.internal_reasoning ?? '0') * 1000

    return {
        inputPer1K,
        outputPer1K,
        ...(cacheReadPer1K > 0 && { cacheReadPer1K }),
        ...(cacheWritePer1K > 0 && { cacheWritePer1K }),
        ...(reasoningPer1K > 0 && { reasoningPer1K }),
        currency: 'USD'
    }
}

export const resolveModelInfo = (model: OpenRouterModelResponse): ModelInfo => {
    const features = resolveFeatures(model.supported_parameters, model.architecture.input_modalities, model.pricing)

    const pricing = resolvePricing(model.pricing)

    return {
        id: model.id,
        name: model.name,
        family: resolveModelFamily(model.id),
        contextWindow: model.top_provider?.context_length ?? model.context_length,
        maxOutputTokens: model.top_provider?.max_completion_tokens ?? model.context_length,
        features,
        deprecated: model.expiration_date !== null,
        providerMetadata: {
            canonicalSlug: model.canonical_slug,
            ...(model.top_provider !== null && { isModerated: model.top_provider.is_moderated }),
            ...(model.default_parameters !== null && { defaultParameters: model.default_parameters })
        },
        ...(pricing !== undefined && { pricing }),
        ...(model.description && { description: model.description })
    }
}
