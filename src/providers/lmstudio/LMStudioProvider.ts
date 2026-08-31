import { z } from 'zod'
import {
    FINISH_REASON,
    FinishReason,
    GenerationResult,
    GenerationSpecification,
    ModelInfo,
    StreamChunk,
    Usage,
    ProviderAuthError,
    ProviderGenerationError,
    ProviderModelNotFoundError,
    ProviderRateLimitError,
    ProviderStreamGenerationError,
    BaseProvider
} from '@provider'
import {
    mapSpecificationToLMStudio,
    mapResponseFromLMStudio,
    mapStreamChunkFromLMStudio,
    resolveModelInfo,
    isChatCapable
} from './utils'
import { LMStudioChatCompletionStreamChunkResponse, LMStudioModelsResponse, LMStudioProviderOptions } from './types'
import { lmStudioChatCompletionResponseSchema, lmStudioModelsResponseSchema } from './validators'

const LMSTUDIO_DEFAULT_BASE_URL = 'http://localhost:1234'
const PROVIDER_NAME = 'lmstudio'
const REACHABILITY_TIMEOUT_MS = 2000

export class LMStudioProvider extends BaseProvider {
    readonly name: string = PROVIDER_NAME

    private readonly baseUrl: string
    private readonly apiKey?: string

    constructor(options?: LMStudioProviderOptions) {
        super()
        this.baseUrl = options?.baseUrl ?? LMSTUDIO_DEFAULT_BASE_URL
        if (options?.apiKey !== undefined) this.apiKey = options.apiKey
    }

    protected async initializeProvider(): Promise<void> {}

    async getDefaultModel(): Promise<string | null> {
        const models = await this.listModels()
        return models[0]?.id ?? null
    }

    protected async fetchModels(): Promise<Array<ModelInfo>> {
        const listing = await this.fetchModelsList()
        return listing.models.filter(isChatCapable).map(model => resolveModelInfo(model))
    }

    protected async checkAccess(): Promise<boolean> {
        try {
            const listing = await this.fetchModelsList()
            return listing.models.some(isChatCapable)
        } catch {
            return false
        }
    }

    private async fetchModelsList(): Promise<LMStudioModelsResponse> {
        return this.request('/api/v1/models', lmStudioModelsResponseSchema, {
            signal: AbortSignal.timeout(REACHABILITY_TIMEOUT_MS)
        })
    }

    protected async executeGenerate(
        specification: GenerationSpecification,
        signal: AbortSignal
    ): Promise<GenerationResult> {
        const startTime = Date.now()
        const requestSpecification = mapSpecificationToLMStudio({ ...specification, stream: false })
        const response = await this.request('/v1/chat/completions', lmStudioChatCompletionResponseSchema, {
            method: 'POST',
            body: requestSpecification,
            signal
        })

        return mapResponseFromLMStudio(response, this.name, Date.now() - startTime)
    }

    protected async *executeGenerateStream(
        specification: GenerationSpecification,
        signal: AbortSignal
    ): AsyncIterable<StreamChunk> {
        const requestSpecification = mapSpecificationToLMStudio({ ...specification, stream: true })

        const response = await this.requestRaw('/v1/chat/completions', {
            method: 'POST',
            body: requestSpecification,
            signal
        })

        const responseReader = response.body?.getReader()
        if (!responseReader) {
            throw new ProviderStreamGenerationError('Response body is not readable')
        }

        const decoder = new TextDecoder()
        let buffer = ''

        let pendingFinishReason: FinishReason | null = null
        let pendingUsage: Usage | null = null

        try {
            while (true) {
                const { done, value } = await responseReader.read()

                if (done) break

                buffer += decoder.decode(value, { stream: true })

                const lines = buffer.split('\n')
                buffer = lines.pop() ?? ''

                for (const line of lines) {
                    const trimmed = line.trim()

                    if (!trimmed || trimmed === 'data: [DONE]') continue
                    if (!trimmed.startsWith('data: ')) continue

                    let chunk: LMStudioChatCompletionStreamChunkResponse

                    try {
                        chunk = JSON.parse(trimmed.slice(6)) as LMStudioChatCompletionStreamChunkResponse
                    } catch {
                        continue
                    }

                    const mapped = mapStreamChunkFromLMStudio(chunk)

                    if (!mapped) continue

                    if (mapped.state === 'streaming') {
                        yield mapped
                        continue
                    }

                    if (mapped.finishReason !== FINISH_REASON.STOP || pendingFinishReason === null) {
                        pendingFinishReason = mapped.finishReason
                    }

                    if (mapped.usage) {
                        pendingUsage = mapped.usage
                    }

                    if (pendingUsage !== null) {
                        yield {
                            state: 'done',
                            finishReason: pendingFinishReason,
                            usage: pendingUsage
                        }

                        pendingFinishReason = null
                        pendingUsage = null
                    }
                }
            }
        } finally {
            responseReader.releaseLock()
        }
    }

    private buildHeaders(): Record<string, string> {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }

        if (this.apiKey !== undefined) {
            headers['Authorization'] = `Bearer ${this.apiKey}`
        }

        return headers
    }

    private async request<TSchema extends z.ZodType>(
        path: string,
        schema: TSchema,
        options: {
            method?: string
            body?: unknown
            signal?: AbortSignal
        } = {}
    ): Promise<z.infer<TSchema>> {
        const response = await this.requestRaw(path, options)
        const data: unknown = await response.json()

        try {
            return schema.parse(data)
        } catch (error) {
            throw new ProviderGenerationError(`LM Studio returned an unexpected response shape for ${path}`, {
                cause: error
            })
        }
    }

    private async requestRaw(
        path: string,
        options: {
            method?: string
            body?: unknown
            signal?: AbortSignal
        } = {}
    ): Promise<Response> {
        const { method = 'GET', body, signal } = options

        let response: Response

        try {
            response = await fetch(`${this.baseUrl}${path}`, {
                method,
                headers: this.buildHeaders(),
                signal: signal ?? null,
                ...(body !== undefined && { body: JSON.stringify(body) })
            })
        } catch (error) {
            throw new ProviderGenerationError(`Could not reach LM Studio at ${this.baseUrl}`, { cause: error })
        }

        if (!response.ok) {
            await this.handleErrorResponse(response)
        }

        return response
    }

    private async handleErrorResponse(response: Response): Promise<never> {
        let errorBody: unknown

        try {
            errorBody = await response.json()
        } catch {
            errorBody = null
        }

        const message = this.extractErrorMessage(errorBody) ?? `HTTP ${response.status}`

        switch (response.status) {
            case 401:
                throw new ProviderAuthError(`LM Studio authentication failed: ${message}`)

            case 429:
                throw new ProviderRateLimitError(`LM Studio rate limit exceeded: ${message}`)

            case 404:
                throw new ProviderModelNotFoundError(`LM Studio model not found: ${message}`)

            default:
                throw new ProviderGenerationError(`LM Studio request failed: ${message}`)
        }
    }

    private extractErrorMessage(errorBody: unknown): string | null {
        if (!errorBody || typeof errorBody !== 'object' || !('error' in errorBody)) {
            return null
        }

        const { error } = errorBody

        if (typeof error === 'string') {
            return error
        }

        if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
            return error.message
        }

        return null
    }
}
