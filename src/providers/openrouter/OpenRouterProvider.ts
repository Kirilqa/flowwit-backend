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
    mapSpecificationToOpenRouter,
    mapResponseFromOpenRouter,
    mapStreamChunkFromOpenRouter,
    resolveModelInfo
} from './utils'
import { OpenRouterChatCompletionStreamChunkResponse, OpenRouterProviderOptions } from './types'
import { openRouterModelsListResponseSchema, openRouterChatCompletionResponseSchema } from './validators'

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1'
const PROVIDER_NAME = 'openrouter'

export class OpenRouterProvider extends BaseProvider {
    readonly name: string = PROVIDER_NAME

    private readonly baseUrl: string
    private readonly httpReferer?: string
    private readonly title?: string

    constructor(
        private readonly apiKey: string,
        options?: OpenRouterProviderOptions
    ) {
        super()
        this.baseUrl = options?.baseUrl ?? OPENROUTER_API_URL
        if (options?.httpReferer !== undefined) this.httpReferer = options.httpReferer
        if (options?.title !== undefined) this.title = options.title
    }

    protected async initializeProvider(): Promise<void> {}

    protected async fetchModels(): Promise<Array<ModelInfo>> {
        const response = await this.request('/models', openRouterModelsListResponseSchema)
        return response.data.map(model => resolveModelInfo(model))
    }

    protected async checkAccess(): Promise<boolean> {
        try {
            await this.request('/models', openRouterModelsListResponseSchema)
            return true
        } catch {
            return false
        }
    }

    protected async executeGenerate(
        specification: GenerationSpecification,
        signal: AbortSignal
    ): Promise<GenerationResult> {
        const startTime = Date.now()
        const requestSpecification = mapSpecificationToOpenRouter({ ...specification, stream: false })
        const response = await this.request('/chat/completions', openRouterChatCompletionResponseSchema, {
            method: 'POST',
            body: requestSpecification,
            signal
        })

        return mapResponseFromOpenRouter(response, this.name, Date.now() - startTime)
    }

    protected async *executeGenerateStream(
        specification: GenerationSpecification,
        signal: AbortSignal
    ): AsyncIterable<StreamChunk> {
        const requestSpecification = mapSpecificationToOpenRouter({ ...specification, stream: true })

        const response = await this.requestRaw('/chat/completions', {
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

                    let chunk: OpenRouterChatCompletionStreamChunkResponse

                    try {
                        chunk = JSON.parse(trimmed.slice(6)) as OpenRouterChatCompletionStreamChunkResponse
                    } catch {
                        continue
                    }

                    const mapped = mapStreamChunkFromOpenRouter(chunk)

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
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`
        }

        if (this.httpReferer) {
            headers['HTTP-Referer'] = this.httpReferer
        }

        if (this.title) {
            headers['X-OpenRouter-Title'] = this.title
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
            throw new ProviderGenerationError(`OpenRouter returned an unexpected response shape for ${path}`, {
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

        const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: this.buildHeaders(),
            signal: signal ?? null,
            ...(body !== undefined && { body: JSON.stringify(body) })
        })

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
                throw new ProviderAuthError(`OpenRouter authentication failed: ${message}`)

            case 429:
                throw new ProviderRateLimitError(`OpenRouter rate limit exceeded: ${message}`)

            case 404:
                throw new ProviderModelNotFoundError(`OpenRouter model not found: ${message}`)

            default:
                throw new ProviderGenerationError(`OpenRouter request failed: ${message}`)
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

        const topMessage = 'message' in error && typeof error.message === 'string' ? error.message : null

        if ('metadata' in error && error.metadata && typeof error.metadata === 'object') {
            const metadata = error.metadata

            if ('raw' in metadata && typeof metadata.raw === 'string') {
                try {
                    const parsed: unknown = JSON.parse(metadata.raw)

                    if (
                        parsed &&
                        typeof parsed === 'object' &&
                        'error' in parsed &&
                        parsed.error &&
                        typeof parsed.error === 'object' &&
                        'message' in parsed.error &&
                        typeof parsed.error.message === 'string'
                    ) {
                        return parsed.error.message
                    }
                } catch {
                    return topMessage
                }
            }
        }

        return topMessage
    }
}
