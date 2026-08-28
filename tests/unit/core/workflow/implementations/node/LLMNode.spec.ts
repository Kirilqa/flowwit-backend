import { WorkFlowNodeError, WORKFLOW_EVENT_TYPE } from '@workflow'
import { LLMNode } from '@workflow/implementations/node/LLMNode'
import { CONTENT_TYPE, FINISH_REASON, MESSAGE_ROLE, ProviderInterface, StreamChunk } from '@provider'
import { runNode } from '../../../../../helpers/runNode'
import { makeProviderRegistry } from '../../../../../helpers/makeAgent'
import { makeProvider, textResponse, errorResponse, toolCallResponse } from '../../../../../helpers/TestProvider'

function makeStreamingProvider(chunks: Array<StreamChunk>): ProviderInterface {
    return {
        name: 'test',
        generate: jest.fn(),
        generateStream: jest.fn(async function* () {
            yield* chunks
        }),
        listModels: jest.fn().mockResolvedValue([]),
        getModelInfo: jest.fn().mockResolvedValue(null),
        getCapabilities: jest.fn(),
        verifyAccess: jest.fn().mockResolvedValue(true)
    } as unknown as ProviderInterface
}

const BASE_CONFIG = {
    providerName: 'test',
    model: 'test-model'
}

describe('LLMNode', () => {
    it('has type "llm"', () => {
        expect(new LLMNode(makeProviderRegistry()).type).toBe('llm')
    })

    it('is not a start node', () => {
        expect(new LLMNode(makeProviderRegistry()).isStart).toBe(false)
    })

    it('is ready when "prompt" port is provided', () => {
        const node = new LLMNode(makeProviderRegistry())
        expect(node.isReady(new Set(['prompt']))).toBe(true)
    })

    it('is not ready when prompt port is missing', () => {
        const node = new LLMNode(makeProviderRegistry())
        expect(node.isReady(new Set())).toBe(false)
    })

    it('throws WorkFlowNodeError when provider is not found in registry', async () => {
        const node = new LLMNode(makeProviderRegistry(makeProvider(), false))
        await expect(
            runNode(node.execute({ prompt: 'Hello' }, { providerName: 'missing', model: 'test-model' }))
        ).rejects.toThrow(WorkFlowNodeError)
    })

    it('returns text output from provider response', async () => {
        const provider = makeProvider().respondWith(textResponse('Hello world'))
        const node = new LLMNode(makeProviderRegistry(provider))
        const { result } = await runNode(node.execute({ prompt: 'Hi' }, BASE_CONFIG))
        expect(result.output['text']).toBe('Hello world')
    })

    it('yields NODE_EVENT events for each text delta', async () => {
        const provider = makeProvider().respondWith(textResponse('Hello'))
        const node = new LLMNode(makeProviderRegistry(provider))
        const { events } = await runNode(node.execute({ prompt: 'Hi' }, BASE_CONFIG))
        expect(events.length).toBeGreaterThan(0)
        expect(events[0]?.type).toBe(WORKFLOW_EVENT_TYPE.NODE_EVENT)
    })

    it('event payload contains text delta', async () => {
        const provider = makeProvider().respondWith(textResponse('Hi there'))
        const node = new LLMNode(makeProviderRegistry(provider))
        const { events } = await runNode(node.execute({ prompt: 'Hello' }, BASE_CONFIG))
        const payload = events[0]?.payload as { delta: string } | undefined
        expect(payload?.delta).toBe('Hi there')
    })

    it('throws WorkFlowNodeError when provider.generateStream throws', async () => {
        const provider = makeProvider().respondWith(errorResponse('Stream failed'))
        const node = new LLMNode(makeProviderRegistry(provider))
        await expect(runNode(node.execute({ prompt: 'Hi' }, BASE_CONFIG))).rejects.toThrow(WorkFlowNodeError)
    })

    it('passes systemPrompt to provider when configured', async () => {
        const provider = makeProvider().respondWith(textResponse('ok'))
        const node = new LLMNode(makeProviderRegistry(provider))
        await runNode(node.execute({ prompt: 'Hi' }, { ...BASE_CONFIG, systemPrompt: 'You are a bot' }))

        const spec = provider.calls[0]
        const messages = spec?.messages ?? []
        expect(messages[0]?.role).toBe('system')
        expect(messages[0]?.content).toBe('You are a bot')
    })

    it('appends user prompt as last message', async () => {
        const provider = makeProvider().respondWith(textResponse('ok'))
        const node = new LLMNode(makeProviderRegistry(provider))
        await runNode(node.execute({ prompt: 'What is 2+2?' }, BASE_CONFIG))

        const spec = provider.calls[0]
        const messages = spec?.messages ?? []
        const last = messages[messages.length - 1]
        expect(last?.role).toBe('user')
        expect(last?.content).toBe('What is 2+2?')
    })

    it('passes temperature when configured', async () => {
        const provider = makeProvider().respondWith(textResponse('ok'))
        const node = new LLMNode(makeProviderRegistry(provider))
        await runNode(node.execute({ prompt: 'Hi' }, { ...BASE_CONFIG, temperature: 0.5 }))
        expect(provider.calls[0]?.temperature).toBe(0.5)
    })

    it('passes maxTokens when configured', async () => {
        const provider = makeProvider().respondWith(textResponse('ok'))
        const node = new LLMNode(makeProviderRegistry(provider))
        await runNode(node.execute({ prompt: 'Hi' }, { ...BASE_CONFIG, maxTokens: 256 }))
        expect(provider.calls[0]?.maxTokens).toBe(256)
    })

    it('accumulates multi-chunk text into single output', async () => {
        const provider = makeProvider()
        provider.setFallback(() => textResponse('Hello world'))
        const node = new LLMNode(makeProviderRegistry(provider))

        const { result } = await runNode(node.execute({ prompt: 'Hi' }, BASE_CONFIG))
        expect(typeof result.output['text']).toBe('string')
        expect((result.output['text'] as string).length).toBeGreaterThan(0)
    })

    it('skips streaming chunks whose delta has no content', async () => {
        const provider = makeStreamingProvider([
            { state: 'streaming', delta: { role: MESSAGE_ROLE.ASSISTANT } },
            {
                state: 'streaming',
                delta: { content: [{ type: CONTENT_TYPE.TEXT, text: 'Hi' }] }
            },
            { state: 'done', finishReason: FINISH_REASON.STOP }
        ])
        const node = new LLMNode(makeProviderRegistry(provider))
        const { result } = await runNode(node.execute({ prompt: 'Hi' }, BASE_CONFIG))
        expect(result.output['text']).toBe('Hi')
    })

    it('skips content parts that are not text', async () => {
        const provider = makeProvider().respondWith(toolCallResponse('doStuff', {}))
        const node = new LLMNode(makeProviderRegistry(provider))
        const { result } = await runNode(node.execute({ prompt: 'Hi' }, BASE_CONFIG))
        expect(result.output['text']).toBe('')
    })

    it('prepends config.messages before the user prompt', async () => {
        const provider = makeProvider().respondWith(textResponse('ok'))
        const node = new LLMNode(makeProviderRegistry(provider))
        const preMessages = [{ role: 'user', content: 'earlier question' }]
        await runNode(node.execute({ prompt: 'follow up' }, { ...BASE_CONFIG, messages: preMessages }))

        const spec = provider.calls[0]
        const messages = spec?.messages ?? []
        const userMessages = messages.filter(m => m.role === 'user')
        expect(userMessages).toHaveLength(2)
        expect(userMessages[0]?.content).toBe('earlier question')
        expect(userMessages[1]?.content).toBe('follow up')
    })
})
