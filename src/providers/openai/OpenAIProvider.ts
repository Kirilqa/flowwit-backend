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
import { mapSpecificationToOpenAI, mapResponseFromOpenAI, mapStreamChunkFromOpenAI, resolveModelInfo } from './utils'
import { OpenAIChatCompletionStreamChunkResponse, OpenAIProviderOptions } from './types'
import { openAIModelsListResponseSchema, openAIChatCompletionResponseSchema } from './validators'

const OPENAI_API_URL = 'https://api.openai.com/v1'
const PROVIDER_NAME = 'openai'

export class OpenAIProvider extends BaseProvider {
    readonly name: string = PROVIDER_NAME

    private readonly baseUrl: string
    private readonly organization?: string
    private readonly project?: string

    constructor(
        private readonly apiKey: string,
        options?: OpenAIProviderOptions
    ) {
        super()
        this.baseUrl = options?.baseUrl ?? OPENAI_API_URL
        if (options?.organization !== undefined) this.organization = options.organization
        if (options?.project !== undefined) this.project = options.project
    }

    protected async initializeProvider(): Promise<void> {}

    protected async fetchModels(): Promise<Array<ModelInfo>> {
        const response = await this.request('/models', openAIModelsListResponseSchema)
        return response.data.map(model => resolveModelInfo(model.id, model.owned_by))
    }

    protected async checkAccess(): Promise<boolean> {
        try {
            await this.request('/models', openAIModelsListResponseSchema)
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
        const requestSpecification = mapSpecificationToOpenAI({ ...specification, stream: false })
        const response = await this.request('/chat/completions', openAIChatCompletionResponseSchema, {
            method: 'POST',
            body: requestSpecification,
            signal
        })

        return mapResponseFromOpenAI(response, this.name, Date.now() - startTime)
    }

    protected async *executeGenerateStream(
        specification: GenerationSpecification,
        signal: AbortSignal
    ): AsyncIterable<StreamChunk> {
        const requestSpecification = mapSpecificationToOpenAI({ ...specification, stream: true })

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

                    let chunk: OpenAIChatCompletionStreamChunkResponse

                    try {
                        chunk = JSON.parse(trimmed.slice(6)) as OpenAIChatCompletionStreamChunkResponse
                    } catch {
                        continue
                    }

                    const mapped = mapStreamChunkFromOpenAI(chunk)

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

        if (this.organization) {
            headers['OpenAI-Organization'] = this.organization
        }

        if (this.project) {
            headers['OpenAI-Project'] = this.project
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
            throw new ProviderGenerationError(`OpenAI returned an unexpected response shape for ${path}`, {
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
                throw new ProviderAuthError(`OpenAI authentication failed: ${message}`)

            case 429:
                throw new ProviderRateLimitError(`OpenAI rate limit exceeded: ${message}`)

            case 404:
                throw new ProviderModelNotFoundError(`OpenAI model not found: ${message}`)

            default:
                throw new ProviderGenerationError(`OpenAI request failed: ${message}`)
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
