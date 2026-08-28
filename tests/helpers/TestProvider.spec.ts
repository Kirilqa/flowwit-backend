import {
    makeProvider,
    TEST_MODEL,
    textResponse,
    toolCallResponse,
    toolCallsResponse,
    errorResponse
} from './TestProvider'
import { FINISH_REASON, MESSAGE_ROLE, CONTENT_TYPE } from '@provider/types'

const SPEC = {
    model: TEST_MODEL,
    messages: [{ role: MESSAGE_ROLE.USER, content: 'hello' }]
}

describe('TestProvider', () => {
    describe('generate() — text response', () => {
        it('returns assistant message with the configured text', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('Hello!'))
            const result = await provider.generate(SPEC)
            const choice = result.data.choices[0]
            expect(choice?.message.content).toBe('Hello!')
            expect(choice?.finishReason).toBe(FINISH_REASON.STOP)
        })

        it('sets role to assistant', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('hi'))
            const result = await provider.generate(SPEC)
            expect(result.data.choices[0]?.message.role).toBe(MESSAGE_ROLE.ASSISTANT)
        })

        it('returns zero usage', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const result = await provider.generate(SPEC)
            expect(result.data.usage.totalTokens).toBe(0)
        })

        it('increments result id across calls', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('a')).respondWith(textResponse('b'))
            const r1 = await provider.generate(SPEC)
            const r2 = await provider.generate(SPEC)
            expect(r1.data.id).not.toBe(r2.data.id)
        })
    })

    describe('generate() — tool call response', () => {
        it('returns tool call content with correct name and args', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', { q: 'test' }, 'call-x'))
            const result = await provider.generate(SPEC)
            const choice = result.data.choices[0]
            expect(choice?.finishReason).toBe(FINISH_REASON.TOOL_CALLS)
            const content = choice?.message.content
            expect(Array.isArray(content)).toBe(true)
            const part = (
                content as Array<{
                    type: string
                    toolCall: { id: string; function: { name: string; arguments: string } }
                }>
            )[0]
            expect(part?.type).toBe(CONTENT_TYPE.TOOL_CALL)
            expect(part?.toolCall.id).toBe('call-x')
            expect(part?.toolCall.function.name).toBe('search')
            expect(JSON.parse(part?.toolCall.function.arguments ?? '{}')).toEqual({ q: 'test' })
        })

        it('supports multiple tool calls via toolCallsResponse', async () => {
            const provider = makeProvider()
            provider.respondWith(
                toolCallsResponse([
                    { name: 'tool_a', args: { x: 1 } },
                    { name: 'tool_b', args: { y: 2 } }
                ])
            )
            const result = await provider.generate(SPEC)
            const content = result.data.choices[0]?.message.content
            expect(Array.isArray(content) && (content as Array<unknown>).length).toBe(2)
        })

        it('auto-assigns ids for toolCallsResponse when not provided', async () => {
            const provider = makeProvider()
            provider.respondWith(
                toolCallsResponse([
                    { name: 'a', args: {} },
                    { name: 'b', args: {} }
                ])
            )
            const result = await provider.generate(SPEC)
            const content = result.data.choices[0]?.message.content as Array<{ toolCall: { id: string } }>
            expect(content[0]?.toolCall.id).toBe('call-1')
            expect(content[1]?.toolCall.id).toBe('call-2')
        })
    })

    describe('generate() — error response', () => {
        it('throws the configured error', async () => {
            const provider = makeProvider()
            provider.respondWith(errorResponse('boom'))
            await expect(provider.generate(SPEC)).rejects.toThrow('boom')
        })

        it('throws with the exact Error instance', async () => {
            const err = new TypeError('type mismatch')
            const provider = makeProvider()
            provider.respondWith(errorResponse(err))
            await expect(provider.generate(SPEC)).rejects.toBe(err)
        })
    })

    describe('queue and fallback', () => {
        it('consumes responses in order', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('first')).respondWith(textResponse('second'))
            const r1 = await provider.generate(SPEC)
            const r2 = await provider.generate(SPEC)
            expect(r1.data.choices[0]?.message.content).toBe('first')
            expect(r2.data.choices[0]?.message.content).toBe('second')
        })

        it('throws when queue is exhausted and no fallback is set', async () => {
            const provider = makeProvider()
            await expect(provider.generate(SPEC)).rejects.toThrow('TestProvider')
        })

        it('falls back to handler when queue is empty', async () => {
            const provider = makeProvider()
            provider.setFallback(() => textResponse('fallback text'))
            const result = await provider.generate(SPEC)
            expect(result.data.choices[0]?.message.content).toBe('fallback text')
        })

        it('handler receives the generation spec', async () => {
            const provider = makeProvider()
            let received: typeof SPEC | null = null
            provider.setFallback(spec => {
                received = spec as typeof SPEC
                return textResponse('ok')
            })
            await provider.generate(SPEC)
            expect(received).toBe(SPEC)
        })

        it('queue entry can also be a handler', async () => {
            const provider = makeProvider()
            provider.respondWith(spec => textResponse(`model:${spec.model}`))
            const result = await provider.generate(SPEC)
            expect(result.data.choices[0]?.message.content).toBe(`model:${TEST_MODEL}`)
        })
    })

    describe('calls tracking', () => {
        it('records each generate call', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('a')).respondWith(textResponse('b'))
            await provider.generate(SPEC)
            await provider.generate(SPEC)
            expect(provider.calls).toHaveLength(2)
        })

        it('calls array is readonly (snapshot)', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('x'))
            await provider.generate(SPEC)
            expect(provider.calls[0]).toBe(SPEC)
        })
    })

    describe('reset()', () => {
        it('clears the queue and call history', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('x'))
            await provider.generate(SPEC)
            provider.reset()
            expect(provider.calls).toHaveLength(0)
            await expect(provider.generate(SPEC)).rejects.toThrow()
        })
    })

    describe('generateStream() — text', () => {
        it('yields a streaming delta and a done chunk', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('streamed'))
            const chunks: Array<unknown> = []
            for await (const chunk of provider.generateStream(SPEC)) {
                chunks.push(chunk)
            }
            expect(chunks).toHaveLength(2)
            const [delta, done] = chunks as [
                { state: string; delta: { content: Array<{ type: string; text: string }> } },
                { state: string; finishReason: string }
            ]
            expect(delta.state).toBe('streaming')
            expect(delta.delta.content[0]?.type).toBe(CONTENT_TYPE.TEXT)
            expect(delta.delta.content[0]?.text).toBe('streamed')
            expect(done.state).toBe('done')
            expect(done.finishReason).toBe(FINISH_REASON.STOP)
        })
    })

    describe('generateStream() — tool call', () => {
        it('yields one delta per tool call plus a done chunk', async () => {
            const provider = makeProvider()
            provider.respondWith(
                toolCallsResponse([
                    { name: 'a', args: {} },
                    { name: 'b', args: {} }
                ])
            )
            const chunks: Array<unknown> = []
            for await (const chunk of provider.generateStream(SPEC)) {
                chunks.push(chunk)
            }
            expect(chunks).toHaveLength(3)
            const last = chunks[2] as { state: string; finishReason: string }
            expect(last.state).toBe('done')
            expect(last.finishReason).toBe(FINISH_REASON.TOOL_CALLS)
        })
    })

    describe('generateStream() — error', () => {
        it('throws the configured error', async () => {
            const provider = makeProvider()
            provider.respondWith(errorResponse('stream error'))
            const gen = provider.generateStream(SPEC)
            await expect(gen[Symbol.asyncIterator]().next()).rejects.toThrow('stream error')
        })
    })

    describe('listModels() / getModelInfo() / getCapabilities()', () => {
        it('listModels returns the test model', async () => {
            const provider = makeProvider()
            const models = await provider.listModels()
            expect(models[0]?.id).toBe(TEST_MODEL)
        })

        it('getModelInfo returns the test model for TEST_MODEL', async () => {
            const provider = makeProvider()
            const info = await provider.getModelInfo(TEST_MODEL)
            expect(info?.id).toBe(TEST_MODEL)
        })

        it('getModelInfo returns null for unknown model', async () => {
            const provider = makeProvider()
            expect(await provider.getModelInfo('gpt-99')).toBeNull()
        })

        it('getCapabilities returns supportsTools=true', async () => {
            const provider = makeProvider()
            const caps = await provider.getCapabilities(TEST_MODEL)
            expect(caps.supportsTools).toBe(true)
        })

        it('verifyAccess returns true', async () => {
            const provider = makeProvider()
            expect(await provider.verifyAccess()).toBe(true)
        })
    })
})
