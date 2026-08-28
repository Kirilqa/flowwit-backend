import { getErrorMessage } from '@core/utils'
import {
    ProviderGenerationError,
    ProviderStreamGenerationError,
    ProviderTimeoutError,
    ProviderValidationError,
    ProviderModelNotFoundError,
    ProviderError,
    ProviderUnexpectedError
} from '../errors'
import {
    GenerationResult,
    GenerationSpecification,
    MODEL_FEATURE,
    ModelInfo,
    ProviderCapabilities,
    ProviderErrorFactory,
    StreamChunk
} from '../types'
import { ProviderInterface } from '../interfaces'

const DEFAULT_TIMEOUT_MS = 120000
const DEFAULT_STREAM_TIMEOUT_MS = 30000

export abstract class BaseProvider implements ProviderInterface {
    abstract readonly name: string

    private modelsCache = new Map<string, ModelInfo>()
    private capabilitiesCache = new Map<string, ProviderCapabilities>()
    protected isInitialized = false
    private initPromise: Promise<void> | null = null

    async initialize(): Promise<void> {
        try {
            await this.initializeProvider()

            const models = await this.fetchModels()

            const nextModelsCache = new Map<string, ModelInfo>()
            const nextCapabilitiesCache = new Map<string, ProviderCapabilities>()

            for (const model of models) {
                nextModelsCache.set(model.id, model)
                nextCapabilitiesCache.set(model.id, this.computeCapabilities(model))
            }

            this.modelsCache = nextModelsCache
            this.capabilitiesCache = nextCapabilitiesCache

            this.isInitialized = true

            this.initPromise = null
        } catch (error) {
            this.initPromise = null

            if (error instanceof ProviderError) {
                throw error
            }

            throw new ProviderUnexpectedError(`Failed to initialize provider: ${getErrorMessage(error)}`, {
                cause: error
            })
        }
    }

    async listModels(): Promise<Array<ModelInfo>> {
        await this.ensureInitialized()
        return Array.from(this.modelsCache.values())
    }

    async getModelInfo(model: string): Promise<ModelInfo | null> {
        await this.ensureInitialized()
        return this.modelsCache.get(model) ?? null
    }

    async getCapabilities(model: string): Promise<ProviderCapabilities> {
        await this.ensureInitialized()
        if (!this.isInitialized || !this.modelsCache.has(model)) {
            throw new ProviderModelNotFoundError(`Model ${model} not found. Call listModels() first.`)
        }

        const capabilities = this.capabilitiesCache.get(model)
        if (!capabilities) {
            throw new ProviderModelNotFoundError(`Capabilities for model ${model} not found`)
        }

        return capabilities
    }

    async generate(specification: GenerationSpecification): Promise<GenerationResult> {
        await this.ensureInitialized()
        await this.validateSpecification(specification)

        const timeoutMs = specification.timeoutMs ?? DEFAULT_TIMEOUT_MS
        const { signal, clearTimer } = this.createTimeoutSignal(timeoutMs)

        try {
            return await this.executeGenerate(specification, signal)
        } catch (error) {
            const isAborted = signal.aborted
            const model = specification.model
            const errorFactory: ProviderErrorFactory = (message, options) =>
                new ProviderGenerationError(`Generation failed for model ${specification.model}: ${message}`, options)

            throw this.normalizeGenerateError(error, isAborted, timeoutMs, model, errorFactory)
        } finally {
            clearTimer()
        }
    }

    async *generateStream(specification: GenerationSpecification): AsyncIterable<StreamChunk> {
        await this.ensureInitialized()
        await this.validateSpecification(specification)

        const timeoutMs = specification.timeoutMs ?? DEFAULT_STREAM_TIMEOUT_MS
        const { signal, resetTimeout, clearTimer } = this.createTimeoutSignal(timeoutMs)

        try {
            for await (const chunk of this.executeGenerateStream(specification, signal)) {
                resetTimeout()
                yield chunk
            }
        } catch (error) {
            const isAborted = signal.aborted
            const model = specification.model
            const errorFactory: ProviderErrorFactory = (message, options) =>
                new ProviderStreamGenerationError(
                    `Streaming generation failed for model ${specification.model}: ${message}`,
                    options
                )

            throw this.normalizeGenerateError(error, isAborted, timeoutMs, model, errorFactory)
        } finally {
            clearTimer()
        }
    }

    async verifyAccess(): Promise<boolean> {
        await this.ensureInitialized()
        return this.checkAccess()
    }

    protected abstract initializeProvider(): Promise<void>
    protected abstract fetchModels(): Promise<Array<ModelInfo>>
    protected abstract executeGenerate(spec: GenerationSpecification, signal: AbortSignal): Promise<GenerationResult>
    protected abstract executeGenerateStream(
        spec: GenerationSpecification,
        signal: AbortSignal
    ): AsyncIterable<StreamChunk>
    protected abstract checkAccess(): Promise<boolean>

    protected computeCapabilities(info: ModelInfo): ProviderCapabilities {
        return {
            supportsStreaming: info.features.includes(MODEL_FEATURE.STREAMING),
            supportsTools: info.features.includes(MODEL_FEATURE.TOOLS),
            supportsVision: info.features.includes(MODEL_FEATURE.VISION),
            supportsAudio: info.features.includes(MODEL_FEATURE.AUDIO),
            supportsVideo: info.features.includes(MODEL_FEATURE.VIDEO),
            supportsJsonMode: info.features.includes(MODEL_FEATURE.JSON_MODE),
            supportsJsonSchema: info.features.includes(MODEL_FEATURE.JSON_SCHEMA),
            supportsStrictToolSchema: info.features.includes(MODEL_FEATURE.STRICT_SCHEMA),
            supportsReasoning: info.features.includes(MODEL_FEATURE.REASONING),
            supportsParallelToolCalls: info.features.includes(MODEL_FEATURE.PARALLEL_TOOL_CALLS),
            supportsCaching: info.features.includes(MODEL_FEATURE.CACHING),
            supportsLogprobs: info.features.includes(MODEL_FEATURE.LOGPROBS),
            supportsSeed: info.features.includes(MODEL_FEATURE.SEED),
            supportsMultipleChoices: info.features.includes(MODEL_FEATURE.MULTIPLE_CHOICES),
            maxContextWindow: info.contextWindow,
            maxOutputTokens: info.maxOutputTokens,
            maxReasoningTokens: info.maxReasoningTokens ?? info.maxOutputTokens,
            maxChoicesCount: info.maxChoicesCount ?? 1
        }
    }

    private async ensureInitialized(): Promise<void> {
        if (this.isInitialized) return

        this.initPromise ??= this.initialize()
        return this.initPromise
    }

    private async validateSpecification(specification: GenerationSpecification): Promise<void> {
        if (!this.modelsCache.has(specification.model)) {
            throw new ProviderValidationError(`Unknown model: ${specification.model}`)
        }

        const capabilities = await this.getCapabilities(specification.model)

        if (specification.maxTokens && specification.maxTokens > capabilities.maxOutputTokens) {
            throw new ProviderValidationError(
                `maxTokens (${specification.maxTokens}) exceeds model limit (${capabilities.maxOutputTokens})`
            )
        }

        if (specification.stream && !capabilities.supportsStreaming) {
            throw new ProviderValidationError(`Model ${specification.model} does not support streaming`)
        }

        if (specification.tools?.length && !capabilities.supportsTools) {
            throw new ProviderValidationError(`Model ${specification.model} does not support tools`)
        }

        if (specification.includeReasoning && !capabilities.supportsReasoning) {
            throw new ProviderValidationError(`Model ${specification.model} does not support reasoning`)
        }

        if (specification.choicesCount && specification.choicesCount > 1) {
            if (!capabilities.supportsMultipleChoices) {
                throw new ProviderValidationError(`Model ${specification.model} does not support multiple choices`)
            }

            if (capabilities.maxChoicesCount && specification.choicesCount > capabilities.maxChoicesCount) {
                throw new ProviderValidationError(
                    `choicesCount (${specification.choicesCount}) exceeds model limit (${capabilities.maxChoicesCount})`
                )
            }
        }
    }

    private normalizeGenerateError(
        error: unknown,
        isAborted: boolean,
        timeoutMs: number,
        model: string,
        errorFactory: ProviderErrorFactory
    ): ProviderError {
        if (error instanceof ProviderError) return error

        if (isAborted) {
            return new ProviderTimeoutError(`Generation timed out after ${timeoutMs}ms for model ${model}`)
        }

        const message = getErrorMessage(error)

        return errorFactory(message, { cause: error })
    }

    private createTimeoutSignal(timeoutMs: number): {
        signal: AbortSignal
        resetTimeout: () => void
        clearTimer: () => void
    } {
        const controller = new AbortController()
        let timeoutId = setTimeout(() => {
            controller.abort()
        }, timeoutMs)

        const resetTimeout = () => {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(() => {
                controller.abort()
            }, timeoutMs)
        }

        const clearTimer = () => {
            clearTimeout(timeoutId)
        }

        return { signal: controller.signal, resetTimeout, clearTimer }
    }
}
