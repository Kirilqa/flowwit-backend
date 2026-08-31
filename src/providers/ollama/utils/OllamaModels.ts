import { MODEL_FAMILY, MODEL_FEATURE, ModelFamily, ModelFeature, ModelInfo } from '@provider'
import { OllamaModelResponse } from '../types'

const resolveModelFamily = (family: string | undefined): ModelFamily => {
    switch (family) {
        case 'llama':
            return MODEL_FAMILY.LLAMA
        case 'mistral':
            return MODEL_FAMILY.MISTRAL
        case 'qwen2':
        case 'qwen3':
            return MODEL_FAMILY.QWEN
        case 'deepseek2':
        case 'deepseek3':
            return MODEL_FAMILY.DEEPSEEK
        default:
            return MODEL_FAMILY.CUSTOM
    }
}

const resolveFeatures = (capabilities: Array<string>): Array<ModelFeature> => {
    const features: Array<ModelFeature> = [MODEL_FEATURE.STREAMING, MODEL_FEATURE.JSON_MODE, MODEL_FEATURE.SEED]

    if (capabilities.includes('tools')) {
        features.push(MODEL_FEATURE.TOOLS)
    }

    if (capabilities.includes('vision')) {
        features.push(MODEL_FEATURE.VISION)
    }

    if (capabilities.includes('thinking')) {
        features.push(MODEL_FEATURE.REASONING)
    }

    if (capabilities.includes('audio')) {
        features.push(MODEL_FEATURE.AUDIO)
    }

    return features
}

export const isChatCapable = (model: OllamaModelResponse): boolean => model.capabilities.includes('completion')

export const resolveModelInfo = (model: OllamaModelResponse): ModelInfo => {
    const contextWindow = model.details.context_length ?? 4096

    return {
        id: model.model,
        name: model.name,
        family: resolveModelFamily(model.details.family),
        contextWindow,
        maxOutputTokens: contextWindow,
        features: resolveFeatures(model.capabilities),
        providerMetadata: {
            digest: model.digest,
            size: model.size,
            ...(model.details.parameter_size !== undefined && { parameterSize: model.details.parameter_size }),
            ...(model.details.quantization_level !== undefined && {
                quantizationLevel: model.details.quantization_level
            }),
            ...(model.details.embedding_length !== undefined && { embeddingLength: model.details.embedding_length })
        }
    }
}
