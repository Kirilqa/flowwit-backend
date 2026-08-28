import { MODEL_FAMILY, MODEL_FEATURE, ModelFeature, ModelInfo } from '@provider'
import { OpenAIModelDefinition } from '../types'

const COMMON_FEATURES: Array<ModelFeature> = [
    MODEL_FEATURE.STREAMING,
    MODEL_FEATURE.TOOLS,
    MODEL_FEATURE.JSON_MODE,
    MODEL_FEATURE.JSON_SCHEMA,
    MODEL_FEATURE.STRICT_SCHEMA,
    MODEL_FEATURE.PARALLEL_TOOL_CALLS,
    MODEL_FEATURE.LOGPROBS,
    MODEL_FEATURE.SEED,
    MODEL_FEATURE.MULTIPLE_CHOICES
]

const VISION_FEATURES: Array<ModelFeature> = [...COMMON_FEATURES, MODEL_FEATURE.VISION]

const CACHING_FEATURES: Array<ModelFeature> = [...VISION_FEATURES, MODEL_FEATURE.CACHING]

const REASONING_CACHING_FEATURES: Array<ModelFeature> = [...CACHING_FEATURES, MODEL_FEATURE.REASONING]

const O_SERIES_FEATURES: Array<ModelFeature> = [
    MODEL_FEATURE.STREAMING,
    MODEL_FEATURE.TOOLS,
    MODEL_FEATURE.VISION,
    MODEL_FEATURE.JSON_SCHEMA,
    MODEL_FEATURE.STRICT_SCHEMA,
    MODEL_FEATURE.PARALLEL_TOOL_CALLS,
    MODEL_FEATURE.REASONING,
    MODEL_FEATURE.CACHING,
    MODEL_FEATURE.MULTIPLE_CHOICES
]

const MODEL_DEFINITIONS: Record<string, OpenAIModelDefinition> = {
    'gpt-5': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.00125, outputPer1K: 0.01, cacheReadPer1K: 0.000125, currency: 'USD' },
        description: 'GPT-5'
    },
    'gpt-5-mini': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.00025, outputPer1K: 0.002, cacheReadPer1K: 0.000025, currency: 'USD' },
        description: 'GPT-5 Mini'
    },
    'gpt-5-nano': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.00005, outputPer1K: 0.0004, cacheReadPer1K: 0.000005, currency: 'USD' },
        description: 'GPT-5 Nano'
    },
    'gpt-5-pro': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.015, outputPer1K: 0.12, currency: 'USD' },
        description: 'GPT-5 Pro'
    },

    'gpt-5.1': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.00125, outputPer1K: 0.01, cacheReadPer1K: 0.000125, currency: 'USD' },
        description: 'GPT-5.1'
    },
    'gpt-5.1-mini': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.00025, outputPer1K: 0.002, cacheReadPer1K: 0.000025, currency: 'USD' },
        description: 'GPT-5.1 Mini'
    },

    'gpt-5.2': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.00175, outputPer1K: 0.014, cacheReadPer1K: 0.000175, currency: 'USD' },
        description: 'GPT-5.2'
    },
    'gpt-5.2-pro': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.021, outputPer1K: 0.168, currency: 'USD' },
        description: 'GPT-5.2 Pro'
    },

    'gpt-5.4': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.0025, outputPer1K: 0.015, cacheReadPer1K: 0.00025, currency: 'USD' },
        description: 'GPT-5.4'
    },
    'gpt-5.4-mini': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.00075, outputPer1K: 0.0045, cacheReadPer1K: 0.000075, currency: 'USD' },
        description: 'GPT-5.4 Mini'
    },
    'gpt-5.4-nano': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.0002, outputPer1K: 0.00125, cacheReadPer1K: 0.00002, currency: 'USD' },
        description: 'GPT-5.4 Nano'
    },
    'gpt-5.4-pro': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.03, outputPer1K: 0.18, currency: 'USD' },
        description: 'GPT-5.4 Pro'
    },
    'gpt-5.5': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.005, outputPer1K: 0.03, cacheReadPer1K: 0.0005, currency: 'USD' },
        description: 'GPT-5.5'
    },
    'gpt-5.5-pro': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: REASONING_CACHING_FEATURES,
        pricing: { inputPer1K: 0.03, outputPer1K: 0.18, currency: 'USD' },
        description: 'GPT-5.5 Pro'
    },
    'gpt-4.1': {
        contextWindow: 1047576,
        maxOutputTokens: 32768,
        maxChoicesCount: 128,
        features: CACHING_FEATURES,
        pricing: { inputPer1K: 0.002, outputPer1K: 0.008, cacheReadPer1K: 0.0005, currency: 'USD' },
        description: 'GPT-4.1'
    },
    'gpt-4.1-mini': {
        contextWindow: 1047576,
        maxOutputTokens: 32768,
        maxChoicesCount: 128,
        features: CACHING_FEATURES,
        pricing: { inputPer1K: 0.0004, outputPer1K: 0.0016, cacheReadPer1K: 0.0001, currency: 'USD' },
        description: 'GPT-4.1 Mini'
    },
    'gpt-4.1-nano': {
        contextWindow: 1047576,
        maxOutputTokens: 32768,
        maxChoicesCount: 128,
        features: CACHING_FEATURES,
        pricing: { inputPer1K: 0.0001, outputPer1K: 0.0004, cacheReadPer1K: 0.000025, currency: 'USD' },
        description: 'GPT-4.1 Nano'
    },

    'gpt-4o': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: CACHING_FEATURES,
        pricing: { inputPer1K: 0.0025, outputPer1K: 0.01, cacheReadPer1K: 0.00125, currency: 'USD' },
        description: 'GPT-4o'
    },
    'gpt-4o-mini': {
        contextWindow: 128000,
        maxOutputTokens: 16384,
        maxChoicesCount: 128,
        features: CACHING_FEATURES,
        pricing: { inputPer1K: 0.00015, outputPer1K: 0.0006, cacheReadPer1K: 0.000075, currency: 'USD' },
        description: 'GPT-4o Mini'
    },

    'gpt-4-turbo': {
        contextWindow: 128000,
        maxOutputTokens: 4096,
        maxChoicesCount: 128,
        features: VISION_FEATURES,
        pricing: { inputPer1K: 0.01, outputPer1K: 0.03, currency: 'USD' },
        deprecated: true,
        description: 'GPT-4 Turbo'
    },
    'gpt-4': {
        contextWindow: 8192,
        maxOutputTokens: 4096,
        maxChoicesCount: 128,
        features: COMMON_FEATURES,
        pricing: { inputPer1K: 0.03, outputPer1K: 0.06, currency: 'USD' },
        deprecated: true,
        description: 'GPT-4'
    },

    'gpt-3.5-turbo': {
        contextWindow: 16385,
        maxOutputTokens: 4096,
        maxChoicesCount: 128,
        features: COMMON_FEATURES,
        pricing: { inputPer1K: 0.0005, outputPer1K: 0.0015, currency: 'USD' },
        deprecated: true,
        description: 'GPT-3.5 Turbo'
    },
    'gpt-3.5-turbo-instruct': {
        contextWindow: 4096,
        maxOutputTokens: 4096,
        maxChoicesCount: 128,
        features: COMMON_FEATURES,
        pricing: { inputPer1K: 0.0015, outputPer1K: 0.002, currency: 'USD' },
        deprecated: true,
        description: 'GPT-3.5 Turbo Instruct'
    },

    o1: {
        contextWindow: 200000,
        maxOutputTokens: 100000,
        maxReasoningTokens: 32768,
        maxChoicesCount: 1,
        features: O_SERIES_FEATURES,
        pricing: { inputPer1K: 0.015, outputPer1K: 0.06, cacheReadPer1K: 0.0075, currency: 'USD' },
        description: 'o1'
    },
    'o1-mini': {
        contextWindow: 128000,
        maxOutputTokens: 65536,
        maxReasoningTokens: 32768,
        maxChoicesCount: 1,
        features: O_SERIES_FEATURES,
        pricing: { inputPer1K: 0.001, outputPer1K: 0.004, currency: 'USD' },
        deprecated: true,
        description: 'o1 Mini'
    },
    'o1-pro': {
        contextWindow: 200000,
        maxOutputTokens: 100000,
        maxReasoningTokens: 32768,
        maxChoicesCount: 1,
        features: O_SERIES_FEATURES,
        pricing: { inputPer1K: 0.15, outputPer1K: 0.6, currency: 'USD' },
        description: 'o1 Pro'
    },

    o3: {
        contextWindow: 200000,
        maxOutputTokens: 100000,
        maxReasoningTokens: 100000,
        maxChoicesCount: 1,
        features: O_SERIES_FEATURES,
        pricing: { inputPer1K: 0.002, outputPer1K: 0.008, cacheReadPer1K: 0.0005, currency: 'USD' },
        description: 'o3'
    },
    'o3-mini': {
        contextWindow: 200000,
        maxOutputTokens: 100000,
        maxReasoningTokens: 100000,
        maxChoicesCount: 1,
        features: O_SERIES_FEATURES,
        pricing: { inputPer1K: 0.0011, outputPer1K: 0.0044, cacheReadPer1K: 0.00055, currency: 'USD' },
        description: 'o3 Mini'
    },

    'o4-mini': {
        contextWindow: 200000,
        maxOutputTokens: 100000,
        maxReasoningTokens: 100000,
        maxChoicesCount: 1,
        features: O_SERIES_FEATURES,
        pricing: { inputPer1K: 0.0011, outputPer1K: 0.0044, cacheReadPer1K: 0.000275, currency: 'USD' },
        description: 'o4 Mini'
    }
}

const PREFIX_FALLBACKS: Array<{ prefix: string; definition: OpenAIModelDefinition }> = [
    { prefix: 'o1', definition: { contextWindow: 200000, maxOutputTokens: 100000, features: O_SERIES_FEATURES } },
    { prefix: 'o3', definition: { contextWindow: 200000, maxOutputTokens: 100000, features: O_SERIES_FEATURES } },
    { prefix: 'o4', definition: { contextWindow: 200000, maxOutputTokens: 100000, features: O_SERIES_FEATURES } },
    {
        prefix: 'gpt-5.5',
        definition: { contextWindow: 128000, maxOutputTokens: 16384, features: REASONING_CACHING_FEATURES }
    },
    {
        prefix: 'gpt-5.4',
        definition: { contextWindow: 128000, maxOutputTokens: 16384, features: REASONING_CACHING_FEATURES }
    },
    {
        prefix: 'gpt-5.2',
        definition: { contextWindow: 128000, maxOutputTokens: 16384, features: REASONING_CACHING_FEATURES }
    },
    {
        prefix: 'gpt-5.1',
        definition: { contextWindow: 128000, maxOutputTokens: 16384, features: REASONING_CACHING_FEATURES }
    },
    {
        prefix: 'gpt-5',
        definition: { contextWindow: 128000, maxOutputTokens: 16384, features: REASONING_CACHING_FEATURES }
    },
    { prefix: 'gpt-4.1', definition: { contextWindow: 1047576, maxOutputTokens: 32768, features: CACHING_FEATURES } },
    { prefix: 'gpt-4o', definition: { contextWindow: 128000, maxOutputTokens: 16384, features: CACHING_FEATURES } },
    { prefix: 'gpt-4-turbo', definition: { contextWindow: 128000, maxOutputTokens: 4096, features: VISION_FEATURES } },
    { prefix: 'gpt-4', definition: { contextWindow: 8192, maxOutputTokens: 4096, features: COMMON_FEATURES } },
    { prefix: 'gpt-3.5', definition: { contextWindow: 16385, maxOutputTokens: 4096, features: COMMON_FEATURES } }
]

const FALLBACK_DEFINITION: OpenAIModelDefinition = {
    contextWindow: 128000,
    maxOutputTokens: 4096,
    features: [MODEL_FEATURE.STREAMING]
}

const resolveDefinition = (modelId: string): OpenAIModelDefinition => {
    if (MODEL_DEFINITIONS[modelId]) {
        return MODEL_DEFINITIONS[modelId]
    }

    const prefixMatch = PREFIX_FALLBACKS.find(({ prefix }) => modelId.startsWith(prefix))
    if (prefixMatch) {
        return prefixMatch.definition
    }

    return FALLBACK_DEFINITION
}

export const resolveModelInfo = (modelId: string, ownedBy: string): ModelInfo => {
    const definition = resolveDefinition(modelId)

    return {
        id: modelId,
        name: modelId,
        family: MODEL_FAMILY.GPT,
        contextWindow: definition.contextWindow,
        maxOutputTokens: definition.maxOutputTokens,
        features: definition.features,
        deprecated: definition.deprecated ?? false,
        providerMetadata: { ownedBy },
        ...(definition.maxReasoningTokens !== undefined && { maxReasoningTokens: definition.maxReasoningTokens }),
        ...(definition.maxChoicesCount !== undefined && { maxChoicesCount: definition.maxChoicesCount }),
        ...(definition.pricing !== undefined && { pricing: definition.pricing }),
        ...(definition.releaseDate !== undefined && { releaseDate: definition.releaseDate }),
        ...(definition.description !== undefined && { description: definition.description })
    }
}
