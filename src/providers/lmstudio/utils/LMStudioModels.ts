import { MODEL_FAMILY, MODEL_FEATURE, ModelFamily, ModelFeature, ModelInfo } from '@provider'
import { stripUndefined } from '@core/utils'
import { LMSTUDIO_MODEL_TYPE_RESPONSE, LMStudioModelResponse } from '../types'

const resolveModelFamily = (architecture: string | undefined): ModelFamily => {
    switch (architecture) {
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

const resolveFeatures = (capabilities: LMStudioModelResponse['capabilities']): Array<ModelFeature> => {
    const features: Array<ModelFeature> = [
        MODEL_FEATURE.STREAMING,
        MODEL_FEATURE.JSON_MODE,
        MODEL_FEATURE.JSON_SCHEMA,
        MODEL_FEATURE.SEED
    ]

    if (capabilities?.trained_for_tool_use) {
        features.push(MODEL_FEATURE.TOOLS)
    }

    if (capabilities?.vision) {
        features.push(MODEL_FEATURE.VISION)
    }

    return features
}

export const isChatCapable = (model: LMStudioModelResponse): boolean =>
    model.type === LMSTUDIO_MODEL_TYPE_RESPONSE.LLM || model.type === LMSTUDIO_MODEL_TYPE_RESPONSE.VLM

export const resolveModelInfo = (model: LMStudioModelResponse): ModelInfo => {
    const contextWindow = model.max_context_length ?? 4096

    return {
        id: model.key,
        name: model.display_name ?? model.key,
        family: resolveModelFamily(model.architecture),
        contextWindow,
        maxOutputTokens: contextWindow,
        features: resolveFeatures(model.capabilities),
        providerMetadata: stripUndefined({
            publisher: model.publisher,
            format: model.format,
            quantization: model.quantization?.name,
            sizeBytes: model.size_bytes,
            paramsString: model.params_string ?? undefined
        })
    }
}
