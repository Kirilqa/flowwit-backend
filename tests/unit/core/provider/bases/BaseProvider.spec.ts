import { BaseProvider } from '@provider/bases/BaseProvider'
import {
    FINISH_REASON,
    GenerationResult,
    GenerationSpecification,
    MESSAGE_ROLE,
    MODEL_FEATURE,
    ModelInfo,
    ProviderCapabilities,
    StreamChunk
} from '@provider/types'
import {
    ProviderAuthError,
    ProviderGenerationError,
    ProviderModelNotFoundError,
    ProviderStreamGenerationError,
    ProviderTimeoutError,
    ProviderUnexpectedError,
    ProviderValidationError
} from '@provider/errors'

function makeModel(
    id: string,
    features: Array<(typeof MODEL_FEATURE)[keyof typeof MODEL_FEATURE]> = [],
    overrides: Partial<ModelInfo> = {}
): ModelInfo {
    return {
        id,
        name: id,
        contextWindow: 8192,
        maxOutputTokens: 1024,
        features,
        ...overrides
    }
}

function makeResult(model = 'basic'): GenerationResult {
    return {
        data: {
            id: 'gen-1',
            model,
            choices: [
                {
                    index: 0,
                    message: { role: MESSAGE_ROLE.ASSISTANT, content: 'OK' },
                    finishReason: FINISH_REASON.STOP
                }
            ],
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
        },
        meta: { provider: 'test', latencyMs: 0 }
    }
}

function makeSpec(model: string, overrides: Partial<GenerationSpecification> = {}): GenerationSpecification {
    return { model, messages: [], ...overrides }
}

async function collectChunks(iterable: AsyncIterable<StreamChunk>): Promise<Array<StreamChunk>> {
    const chunks: Array<StreamChunk> = []
    for await (const chunk of iterable) {
        chunks.push(chunk)
    }
    return chunks
}

class ConcreteProvider extends BaseProvider {
    readonly name = 'test-concrete'
    initError: Error | null = null
    generateError: Error | null = null
    models: Array<ModelInfo> = [makeModel('basic')]
    result: GenerationResult = makeResult()
    accessResult = true

    testComputeCapabilities(info: ModelInfo): ProviderCapabilities {
        return this.computeCapabilities(info)
    }

    protected async initializeProvider(): Promise<void> {
        if (this.initError !== null) throw this.initError
    }

    protected async fetchModels(): Promise<Array<ModelInfo>> {
        return this.models
    }

    protected async executeGenerate(_spec: GenerationSpecification, _signal: AbortSignal): Promise<GenerationResult> {
        if (this.generateError !== null) throw this.generateError
        return this.result
    }

    protected async *executeGenerateStream(
        _spec: GenerationSpecification,
        _signal: AbortSignal
    ): AsyncIterable<StreamChunk> {
        if (this.generateError !== null) throw this.generateError
        yield { state: 'done', finishReason: FINISH_REASON.STOP }
    }

    protected async checkAccess(): Promise<boolean> {
        return this.accessResult
    }

    async getDefaultModel(): Promise<string | null> {
        const models = await this.listModels()
        return models[0]?.id ?? null
    }
}

class PartialStreamThenHangProvider extends ConcreteProvider {
    protected override async *executeGenerateStream(
        _spec: GenerationSpecification,
        signal: AbortSignal
    ): AsyncIterable<StreamChunk> {
        yield { state: 'streaming', delta: {} }
        await new Promise<void>((_resolve, reject) => {
            signal.addEventListener('abort', () => {
                reject(new Error('aborted after reset'))
            })
        })
    }
}

class SignalAwareProvider extends ConcreteProvider {
    protected override async executeGenerate(
        _spec: GenerationSpecification,
        signal: AbortSignal
    ): Promise<GenerationResult> {
        await new Promise<void>((_resolve, reject) => {
            signal.addEventListener('abort', () => {
                reject(new Error('aborted by signal'))
            })
        })
        return this.result
    }

    protected override async *executeGenerateStream(
        _spec: GenerationSpecification,
        signal: AbortSignal
    ): AsyncIterable<StreamChunk> {
        await new Promise<void>((_resolve, reject) => {
            signal.addEventListener('abort', () => {
                reject(new Error('stream aborted by signal'))
            })
        })
        yield { state: 'done', finishReason: FINISH_REASON.STOP }
    }
}

describe('BaseProvider', () => {
    let provider: ConcreteProvider

    beforeEach(() => {
        provider = new ConcreteProvider()
    })

    describe('initialization', () => {
        it('listModels() triggers initialization lazily', async () => {
            const models = await provider.listModels()
            expect(models).toHaveLength(1)
        })

        it('concurrent calls to listModels() only initialize once', async () => {
            let initCount = 0
            provider.initError = null
            const original = provider['initializeProvider'].bind(provider)
            provider['initializeProvider'] = async () => {
                initCount++
                return original()
            }

            await Promise.all([provider.listModels(), provider.listModels(), provider.listModels()])
            expect(initCount).toBe(1)
        })

        it('wraps generic Error from initializeProvider in ProviderUnexpectedError', async () => {
            provider.initError = new Error('disk failure')
            await expect(provider.listModels()).rejects.toBeInstanceOf(ProviderUnexpectedError)
        })

        it('re-throws ProviderError from initializeProvider without wrapping', async () => {
            provider.initError = new ProviderValidationError('bad config')
            await expect(provider.listModels()).rejects.toBeInstanceOf(ProviderValidationError)
        })

        it('allows retry after failed initialization', async () => {
            provider.initError = new Error('transient failure')
            await expect(provider.listModels()).rejects.toThrow()

            provider.initError = null
            const models = await provider.listModels()
            expect(models).toHaveLength(1)
        })

        it('throws ProviderAuthError when checkAccess resolves false', async () => {
            provider.accessResult = false
            await expect(provider.listModels()).rejects.toBeInstanceOf(ProviderAuthError)
        })

        it('allows retry after a failed access check once the key becomes valid', async () => {
            provider.accessResult = false
            await expect(provider.listModels()).rejects.toBeInstanceOf(ProviderAuthError)

            provider.accessResult = true
            const models = await provider.listModels()
            expect(models).toHaveLength(1)
        })
    })

    describe('listModels()', () => {
        it('returns all models from fetchModels', async () => {
            provider.models = [makeModel('a'), makeModel('b'), makeModel('c')]
            const models = await provider.listModels()
            expect(models.map(m => m.id)).toEqual(['a', 'b', 'c'])
        })
    })

    describe('getModelInfo()', () => {
        it('returns ModelInfo for a registered model', async () => {
            const info = await provider.getModelInfo('basic')
            expect(info?.id).toBe('basic')
        })

        it('returns null for an unknown model', async () => {
            expect(await provider.getModelInfo('unknown')).toBeNull()
        })
    })

    describe('getCapabilities()', () => {
        it('returns capabilities for a registered model', async () => {
            const caps = await provider.getCapabilities('basic')
            expect(caps).toBeDefined()
        })

        it('throws ProviderModelNotFoundError for unknown model', async () => {
            await provider.listModels()
            await expect(provider.getCapabilities('unknown')).rejects.toBeInstanceOf(ProviderModelNotFoundError)
        })

        it('throws ProviderModelNotFoundError when capabilities cache is missing an entry for a known model', async () => {
            await provider.listModels()
            ;(provider as unknown as { capabilitiesCache: Map<string, unknown> }).capabilitiesCache.delete('basic')
            await expect(provider.getCapabilities('basic')).rejects.toBeInstanceOf(ProviderModelNotFoundError)
        })
    })

    describe('computeCapabilities()', () => {
        it('model with no features has all capabilities false', () => {
            const caps = provider.testComputeCapabilities(makeModel('empty', []))
            expect(caps.supportsStreaming).toBe(false)
            expect(caps.supportsTools).toBe(false)
            expect(caps.supportsVision).toBe(false)
            expect(caps.supportsReasoning).toBe(false)
        })

        it('maps STREAMING feature to supportsStreaming', () => {
            const caps = provider.testComputeCapabilities(makeModel('m', [MODEL_FEATURE.STREAMING]))
            expect(caps.supportsStreaming).toBe(true)
        })

        it('maps TOOLS feature to supportsTools', () => {
            const caps = provider.testComputeCapabilities(makeModel('m', [MODEL_FEATURE.TOOLS]))
            expect(caps.supportsTools).toBe(true)
        })

        it('maps REASONING feature to supportsReasoning', () => {
            const caps = provider.testComputeCapabilities(makeModel('m', [MODEL_FEATURE.REASONING]))
            expect(caps.supportsReasoning).toBe(true)
        })

        it('sets maxContextWindow and maxOutputTokens from ModelInfo', () => {
            const model = makeModel('m', [], { contextWindow: 200000, maxOutputTokens: 8192 })
            const caps = provider.testComputeCapabilities(model)
            expect(caps.maxContextWindow).toBe(200000)
            expect(caps.maxOutputTokens).toBe(8192)
        })

        it('uses maxReasoningTokens when present, falls back to maxOutputTokens', () => {
            const withReasoning = makeModel('m', [], { maxOutputTokens: 4096, maxReasoningTokens: 2048 })
            const withoutReasoning = makeModel('m', [], { maxOutputTokens: 4096 })
            expect(provider.testComputeCapabilities(withReasoning).maxReasoningTokens).toBe(2048)
            expect(provider.testComputeCapabilities(withoutReasoning).maxReasoningTokens).toBe(4096)
        })

        it('uses maxChoicesCount when present, defaults to 1', () => {
            const withChoices = makeModel('m', [], { maxChoicesCount: 5 })
            const withoutChoices = makeModel('m', [])
            expect(provider.testComputeCapabilities(withChoices).maxChoicesCount).toBe(5)
            expect(provider.testComputeCapabilities(withoutChoices).maxChoicesCount).toBe(1)
        })
    })

    describe('validateSpecification()', () => {
        it('throws ProviderValidationError for unknown model', async () => {
            await expect(provider.generate(makeSpec('unknown'))).rejects.toBeInstanceOf(ProviderValidationError)
        })

        it('throws ProviderValidationError when maxTokens exceeds model limit', async () => {
            await expect(provider.generate(makeSpec('basic', { maxTokens: 9999 }))).rejects.toBeInstanceOf(
                ProviderValidationError
            )
        })

        it('throws ProviderValidationError when stream is true but model lacks streaming', async () => {
            await expect(provider.generate(makeSpec('basic', { stream: true }))).rejects.toBeInstanceOf(
                ProviderValidationError
            )
        })

        it('throws ProviderValidationError when tools provided but model lacks tools support', async () => {
            await expect(
                provider.generate(
                    makeSpec('basic', {
                        tools: [{ type: 'function', function: { name: 't', description: 'd', parameters: {} } }]
                    })
                )
            ).rejects.toBeInstanceOf(ProviderValidationError)
        })

        it('throws ProviderValidationError when includeReasoning but model lacks reasoning', async () => {
            await expect(provider.generate(makeSpec('basic', { includeReasoning: true }))).rejects.toBeInstanceOf(
                ProviderValidationError
            )
        })

        it('throws ProviderValidationError when choicesCount > 1 but model lacks multipleChoices', async () => {
            await expect(provider.generate(makeSpec('basic', { choicesCount: 2 }))).rejects.toBeInstanceOf(
                ProviderValidationError
            )
        })

        it('throws ProviderValidationError when choicesCount exceeds maxChoicesCount', async () => {
            provider.models = [makeModel('multi', [MODEL_FEATURE.MULTIPLE_CHOICES], { maxChoicesCount: 3 })]
            await expect(provider.generate(makeSpec('multi', { choicesCount: 5 }))).rejects.toBeInstanceOf(
                ProviderValidationError
            )
        })

        it('allows choicesCount within maxChoicesCount for a multi-choice model', async () => {
            provider.models = [makeModel('multi', [MODEL_FEATURE.MULTIPLE_CHOICES], { maxChoicesCount: 3 })]
            provider.result = makeResult('multi')
            await expect(provider.generate(makeSpec('multi', { choicesCount: 2 }))).resolves.toBeDefined()
        })
    })

    describe('generate()', () => {
        it('returns GenerationResult from executeGenerate', async () => {
            const result = await provider.generate(makeSpec('basic'))
            expect(result.data.model).toBe('basic')
        })

        it('wraps generic Error in ProviderGenerationError', async () => {
            provider.generateError = new Error('network failure')
            await expect(provider.generate(makeSpec('basic'))).rejects.toBeInstanceOf(ProviderGenerationError)
        })

        it('re-throws ProviderError from executeGenerate without wrapping', async () => {
            provider.generateError = new ProviderModelNotFoundError('gone')
            await expect(provider.generate(makeSpec('basic'))).rejects.toBeInstanceOf(ProviderModelNotFoundError)
        })

        it('throws ProviderTimeoutError when timeout elapses', async () => {
            jest.useFakeTimers()
            try {
                const slow = new SignalAwareProvider()
                slow.models = [makeModel('basic')]
                const genPromise = slow.generate(makeSpec('basic', { timeoutMs: 100 }))
                const check = expect(genPromise).rejects.toBeInstanceOf(ProviderTimeoutError)
                await jest.advanceTimersByTimeAsync(200)
                await check
            } finally {
                jest.useRealTimers()
            }
        })
    })

    describe('generateStream()', () => {
        it('yields chunks from executeGenerateStream', async () => {
            const chunks = await collectChunks(provider.generateStream(makeSpec('basic')))
            expect(chunks.length).toBeGreaterThan(0)
        })

        it('wraps generic Error in ProviderStreamGenerationError', async () => {
            provider.generateError = new Error('stream broke')
            await expect(collectChunks(provider.generateStream(makeSpec('basic')))).rejects.toBeInstanceOf(
                ProviderStreamGenerationError
            )
        })

        it('re-throws ProviderError from executeGenerateStream without wrapping', async () => {
            provider.generateError = new ProviderModelNotFoundError('gone')
            await expect(collectChunks(provider.generateStream(makeSpec('basic')))).rejects.toBeInstanceOf(
                ProviderModelNotFoundError
            )
        })

        it('throws ProviderTimeoutError when stream times out between chunks', async () => {
            jest.useFakeTimers()
            try {
                const slow = new SignalAwareProvider()
                slow.models = [makeModel('basic')]
                const streamPromise = collectChunks(slow.generateStream(makeSpec('basic', { timeoutMs: 100 })))
                const check = expect(streamPromise).rejects.toBeInstanceOf(ProviderTimeoutError)
                await jest.advanceTimersByTimeAsync(200)
                await check
            } finally {
                jest.useRealTimers()
            }
        })

        it('throws ProviderTimeoutError when the timer resets after a chunk but then no chunk follows in time', async () => {
            jest.useFakeTimers()
            try {
                const slow = new PartialStreamThenHangProvider()
                slow.models = [makeModel('basic')]
                const streamPromise = collectChunks(slow.generateStream(makeSpec('basic', { timeoutMs: 100 })))
                const check = expect(streamPromise).rejects.toBeInstanceOf(ProviderTimeoutError)
                await jest.advanceTimersByTimeAsync(200)
                await check
            } finally {
                jest.useRealTimers()
            }
        })
    })

    describe('getDefaultModel()', () => {
        it('returns the id of the first available model', async () => {
            provider.models = [makeModel('first'), makeModel('second')]
            expect(await provider.getDefaultModel()).toBe('first')
        })

        it('returns null when no models are available', async () => {
            provider.models = []
            expect(await provider.getDefaultModel()).toBeNull()
        })
    })

    describe('verifyAccess()', () => {
        it('returns true when checkAccess resolves true', async () => {
            expect(await provider.verifyAccess()).toBe(true)
        })

        it('rejects with ProviderAuthError when the key is invalid on first initialization', async () => {
            provider.accessResult = false
            await expect(provider.verifyAccess()).rejects.toBeInstanceOf(ProviderAuthError)
        })

        it('returns false when access is revoked after a successful initialization', async () => {
            await provider.listModels()

            provider.accessResult = false
            expect(await provider.verifyAccess()).toBe(false)
        })
    })
})
