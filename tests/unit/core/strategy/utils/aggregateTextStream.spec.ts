import { aggregateTextStream } from '@strategy/utils/aggregateTextStream'
import { CONTENT_TYPE, StreamChunk, FINISH_REASON, Usage } from '@provider'
import { toAsyncIterable } from '../../../../helpers/toAsyncIterable'

function textDelta(...texts: Array<string>): StreamChunk {
    return {
        state: 'streaming',
        delta: { content: texts.map(text => ({ type: CONTENT_TYPE.TEXT, text })) }
    }
}

function toolCallDelta(): StreamChunk {
    return {
        state: 'streaming',
        delta: {
            content: [{ type: CONTENT_TYPE.TOOL_CALL, toolCall: { index: 0, function: { arguments: '{}' } } }]
        }
    }
}

function thinkingDelta(thinking: string): StreamChunk {
    return { state: 'streaming', delta: { content: [{ type: CONTENT_TYPE.THINKING, thinking }] } }
}

function doneChunk(usage?: Usage): StreamChunk {
    return { state: 'done', finishReason: FINISH_REASON.STOP, ...(usage !== undefined && { usage }) }
}

describe('aggregateTextStream', () => {
    it('returns empty text with no usage key for an empty stream', async () => {
        const result = await aggregateTextStream(toAsyncIterable([]))
        expect(result).toEqual({ text: '' })
        expect('usage' in result).toBe(false)
    })

    it('accumulates text from a single streaming chunk', async () => {
        const result = await aggregateTextStream(toAsyncIterable([textDelta('Hello')]))
        expect(result.text).toBe('Hello')
    })

    it('concatenates text across multiple streaming chunks in order', async () => {
        const result = await aggregateTextStream(toAsyncIterable([textDelta('Hello, '), textDelta('world!')]))
        expect(result.text).toBe('Hello, world!')
    })

    it('concatenates multiple text parts within a single chunk', async () => {
        const result = await aggregateTextStream(toAsyncIterable([textDelta('foo', 'bar')]))
        expect(result.text).toBe('foobar')
    })

    it('ignores chunks with no content', async () => {
        const chunk: StreamChunk = { state: 'streaming', delta: {} }
        const result = await aggregateTextStream(toAsyncIterable([chunk]))
        expect(result.text).toBe('')
    })

    it('ignores chunks with an empty content array', async () => {
        const chunk: StreamChunk = { state: 'streaming', delta: { content: [] } }
        const result = await aggregateTextStream(toAsyncIterable([chunk]))
        expect(result.text).toBe('')
    })

    it('ignores non-text delta parts (tool_call)', async () => {
        const result = await aggregateTextStream(toAsyncIterable([toolCallDelta()]))
        expect(result.text).toBe('')
    })

    it('ignores non-text delta parts (thinking)', async () => {
        const result = await aggregateTextStream(toAsyncIterable([thinkingDelta('pondering...')]))
        expect(result.text).toBe('')
    })

    it('only accumulates the text part when a chunk mixes text and tool_call parts', async () => {
        const mixed: StreamChunk = {
            state: 'streaming',
            delta: {
                content: [
                    { type: CONTENT_TYPE.TEXT, text: 'thinking about it: ' },
                    { type: CONTENT_TYPE.TOOL_CALL, toolCall: { index: 0, function: { arguments: '{}' } } }
                ]
            }
        }
        const result = await aggregateTextStream(toAsyncIterable([mixed]))
        expect(result.text).toBe('thinking about it: ')
    })

    it('includes usage from the done chunk when present', async () => {
        const usage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
        const result = await aggregateTextStream(toAsyncIterable([textDelta('hi'), doneChunk(usage)]))
        expect(result.usage).toEqual(usage)
    })

    it('omits the usage key when the done chunk has no usage', async () => {
        const result = await aggregateTextStream(toAsyncIterable([textDelta('hi'), doneChunk()]))
        expect('usage' in result).toBe(false)
    })

    it('returns empty text when the stream is immediately done', async () => {
        const result = await aggregateTextStream(toAsyncIterable([doneChunk()]))
        expect(result).toEqual({ text: '' })
    })
})
