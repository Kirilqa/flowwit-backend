import { ProviderInterface } from '@provider/interfaces'
import {
    CONTENT_TYPE,
    FINISH_REASON,
    GenerationResult,
    GenerationSpecification,
    MESSAGE_ROLE,
    MODEL_FEATURE,
    ModelInfo,
    ProviderCapabilities,
    StreamChunk
} from '@provider/types'

export const TEST_MODEL = 'test-model'

export type TestTextResponse = {
    type: 'text'
    content: string
}

export type TestToolCallResponse = {
    type: 'tool_call'
    calls: Array<{ id: string; name: string; args: Record<string, unknown> }>
}

export type TestErrorResponse = {
    type: 'error'
    error: Error
}

export type TestResponse = TestTextResponse | TestToolCallResponse | TestErrorResponse
export type TestResponseHandler = (spec: GenerationSpecification) => TestResponse

export function textResponse(content: string): TestTextResponse {
    return { type: 'text', content }
}

export function toolCallResponse(name: string, args: Record<string, unknown>, id = 'call-1'): TestToolCallResponse {
    return { type: 'tool_call', calls: [{ id, name, args }] }
}

export function toolCallsResponse(
    calls: Array<{ name: string; args: Record<string, unknown>; id?: string }>
): TestToolCallResponse {
    return {
        type: 'tool_call',
        calls: calls.map((c, i) => ({ id: c.id ?? `call-${i + 1}`, name: c.name, args: c.args }))
    }
}

export function errorResponse(error: Error | string): TestErrorResponse {
    return { type: 'error', error: typeof error === 'string' ? new Error(error) : error }
}

export class TestProvider implements ProviderInterface {
    readonly name = 'test'

    private genCounter = 0
    private queue: Array<TestResponse | TestResponseHandler> = []
    private fallback: TestResponseHandler | null = null
    private _calls: Array<GenerationSpecification> = []

    respondWith(response: TestResponse | TestResponseHandler): this {
        this.queue.push(response)
        return this
    }

    setFallback(handler: TestResponseHandler): this {
        this.fallback = handler
        return this
    }

    get calls(): ReadonlyArray<GenerationSpecification> {
        return this._calls
    }

    reset(): void {
        this.queue = []
        this.fallback = null
        this._calls = []
        this.genCounter = 0
    }

    private nextId(): string {
        this.genCounter += 1
        return `test-gen-${this.genCounter}`
    }

    private resolve(spec: GenerationSpecification): TestResponse {
        this._calls.push(spec)
        const next = this.queue.shift()
        if (next !== undefined) {
            return typeof next === 'function' ? next(spec) : next
        }
        if (this.fallback) return this.fallback(spec)
        throw new Error(`TestProvider: no queued response for call #${this._calls.length}`)
    }

    private toResult(
        spec: GenerationSpecification,
        response: TestTextResponse | TestToolCallResponse
    ): GenerationResult {
        const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

        if (response.type === 'text') {
            return {
                data: {
                    id: this.nextId(),
                    model: spec.model,
                    choices: [
                        {
                            index: 0,
                            message: { role: MESSAGE_ROLE.ASSISTANT, content: response.content },
                            finishReason: FINISH_REASON.STOP
                        }
                    ],
                    usage
                },
                meta: { provider: 'test', latencyMs: 0 }
            }
        }

        return {
            data: {
                id: this.nextId(),
                model: spec.model,
                choices: [
                    {
                        index: 0,
                        message: {
                            role: MESSAGE_ROLE.ASSISTANT,
                            content: response.calls.map(c => ({
                                type: CONTENT_TYPE.TOOL_CALL,
                                toolCall: {
                                    id: c.id,
                                    function: { name: c.name, arguments: JSON.stringify(c.args) }
                                }
                            }))
                        },
                        finishReason: FINISH_REASON.TOOL_CALLS
                    }
                ],
                usage
            },
            meta: { provider: 'test', latencyMs: 0 }
        }
    }

    private async *toStream(response: TestTextResponse | TestToolCallResponse): AsyncIterable<StreamChunk> {
        const usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }

        if (response.type === 'text') {
            yield {
                state: 'streaming',
                delta: {
                    role: MESSAGE_ROLE.ASSISTANT,
                    content: [{ type: CONTENT_TYPE.TEXT, text: response.content }]
                }
            }
            yield { state: 'done', finishReason: FINISH_REASON.STOP, usage }
            return
        }

        for (const [i, call] of response.calls.entries()) {
            yield {
                state: 'streaming',
                delta: {
                    content: [
                        {
                            type: CONTENT_TYPE.TOOL_CALL,
                            toolCall: {
                                id: call.id,
                                index: i,
                                function: { name: call.name, arguments: JSON.stringify(call.args) }
                            }
                        }
                    ]
                }
            }
        }

        yield { state: 'done', finishReason: FINISH_REASON.TOOL_CALLS, usage }
    }

    async generate(spec: GenerationSpecification): Promise<GenerationResult> {
        const response = this.resolve(spec)
        if (response.type === 'error') throw response.error
        return this.toResult(spec, response)
    }

    async *generateStream(spec: GenerationSpecification): AsyncIterable<StreamChunk> {
        const response = this.resolve(spec)
        if (response.type === 'error') throw response.error
        yield* this.toStream(response)
    }

    async initialize(): Promise<void> {}

    async getDefaultModel(): Promise<string | null> {
        return TEST_MODEL
    }

    async listModels(): Promise<Array<ModelInfo>> {
        return [testModelInfo()]
    }

    async getModelInfo(model: string): Promise<ModelInfo | null> {
        return model === TEST_MODEL ? testModelInfo() : null
    }

    async getCapabilities(_model: string): Promise<ProviderCapabilities> {
        return testCapabilities()
    }

    async verifyAccess(): Promise<boolean> {
        return true
    }
}

export function makeProvider(): TestProvider {
    return new TestProvider()
}

function testModelInfo(): ModelInfo {
    return {
        id: TEST_MODEL,
        name: 'Test Model',
        contextWindow: 1_000_000,
        maxOutputTokens: 4096,
        features: [MODEL_FEATURE.STREAMING, MODEL_FEATURE.TOOLS, MODEL_FEATURE.PARALLEL_TOOL_CALLS]
    }
}

function testCapabilities(): ProviderCapabilities {
    return {
        supportsStreaming: true,
        supportsTools: true,
        supportsVision: false,
        supportsAudio: false,
        supportsVideo: false,
        supportsJsonMode: false,
        supportsJsonSchema: false,
        supportsStrictToolSchema: false,
        supportsReasoning: false,
        supportsParallelToolCalls: true,
        supportsCaching: false,
        supportsLogprobs: false,
        supportsSeed: false,
        supportsMultipleChoices: false,
        maxContextWindow: 1_000_000,
        maxOutputTokens: 4096,
        maxChoicesCount: 1
    }
}
