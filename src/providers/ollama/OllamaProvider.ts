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
    mapSpecificationToOllama,
    mapResponseFromOllama,
    mapStreamChunkFromOllama,
    resolveModelInfo,
    isChatCapable
} from './utils'
import { OllamaChatCompletionStreamChunkResponse, OllamaProviderOptions, OllamaTagsResponse } from './types'
import { ollamaChatCompletionResponseSchema, ollamaTagsResponseSchema } from './validators'

const OLLAMA_DEFAULT_BASE_URL = 'http://localhost:11434'
const PROVIDER_NAME = 'ollama'
const REACHABILITY_TIMEOUT_MS = 2000

export class OllamaProvider extends BaseProvider {
    readonly name: string = PROVIDER_NAME

    private readonly baseUrl: string

    constructor(options?: OllamaProviderOptions) {
        super()
        this.baseUrl = options?.baseUrl ?? OLLAMA_DEFAULT_BASE_URL
    }

    protected async initializeProvider(): Promise<void> {}

    async getDefaultModel(): Promise<string | null> {
        const models = await this.listModels()
        return models[0]?.id ?? null
    }

    protected async fetchModels(): Promise<Array<ModelInfo>> {
        const tags = await this.fetchTags()
        return tags.models.filter(isChatCapable).map(model => resolveModelInfo(model))
    }

    protected async checkAccess(): Promise<boolean> {
        try {
            const tags = await this.fetchTags()
            return tags.models.some(isChatCapable)
        } catch {
            return false
        }
    }

    private async fetchTags(): Promise<OllamaTagsResponse> {
        return this.request('/api/tags', ollamaTagsResponseSchema, {
            signal: AbortSignal.timeout(REACHABILITY_TIMEOUT_MS)
        })
    }

    protected async executeGenerate(
        specification: GenerationSpecification,
        signal: AbortSignal
    ): Promise<GenerationResult> {
        const startTime = Date.now()
        const requestSpecification = mapSpecificationToOllama({ ...specification, stream: false })
        const response = await this.request('/v1/chat/completions', ollamaChatCompletionResponseSchema, {
            method: 'POST',
            body: requestSpecification,
            signal
        })

        return mapResponseFromOllama(response, this.name, Date.now() - startTime)
    }

    protected async *executeGenerateStream(
        specification: GenerationSpecification,
        signal: AbortSignal
    ): AsyncIterable<StreamChunk> {
        const requestSpecification = mapSpecificationToOllama({ ...specification, stream: true })

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

                    let chunk: OllamaChatCompletionStreamChunkResponse

                    try {
                        chunk = JSON.parse(trimmed.slice(6)) as OllamaChatCompletionStreamChunkResponse
                    } catch {
                        continue
                    }

                    const mapped = mapStreamChunkFromOllama(chunk)

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
        return { 'Content-Type': 'application/json' }
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
            throw new ProviderGenerationError(`Ollama returned an unexpected response shape for ${path}`, {
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
            throw new ProviderGenerationError(`Could not reach Ollama at ${this.baseUrl}`, { cause: error })
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
                throw new ProviderAuthError(`Ollama authentication failed: ${message}`)

            case 429:
                throw new ProviderRateLimitError(`Ollama rate limit exceeded: ${message}`)

            case 404:
                throw new ProviderModelNotFoundError(`Ollama model not found: ${message}`)

            default:
                throw new ProviderGenerationError(`Ollama request failed: ${message}`)
        }
    }

    private extractErrorMessage(errorBody: unknown): string | null {
        if (!errorBody || typeof errorBody !== 'object') {
            return null
        }

        if (!('error' in errorBody) || !errorBody.error || typeof errorBody.error !== 'object') {
            return null
        }

        const error = errorBody.error

        return 'message' in error && typeof error.message === 'string' ? error.message : null
    }
}
