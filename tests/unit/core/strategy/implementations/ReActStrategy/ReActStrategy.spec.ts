import { STRATEGY_DECISION, StrategyDecision, StrategyGenerateFunction } from '@strategy'
import { ReActStrategy } from '@strategy/implementations/ReActStrategy/ReActStrategy'
import { ToolResult } from '@tool'
import { MESSAGE_ROLE } from '@provider/types/MessageRole'
import { CONTENT_TYPE } from '@provider/types/ContentType'
import { FINISH_REASON } from '@provider/types/response/FinishReason'
import { StreamChunk } from '@provider/types/response/StreamChunk'
import { Message } from '@provider/types/Message'
import {
    makeProvider,
    TestProvider,
    TEST_MODEL,
    textResponse,
    toolCallResponse,
    toolCallsResponse
} from '../../../../../helpers/TestProvider'

async function runStrategy(
    provider: TestProvider,
    messages: Array<Message> = [{ role: MESSAGE_ROLE.USER, content: 'hello' }]
): Promise<Array<StrategyDecision>> {
    const generate: StrategyGenerateFunction = msgs => provider.generateStream({ model: TEST_MODEL, messages: msgs })
    const strategy = new ReActStrategy()
    const gen = strategy.execute({ messages: [...messages], generate })
    const decisions: Array<StrategyDecision> = []
    let next: ToolResult | undefined = undefined

    while (true) {
        const step = await gen.next(next)
        if (step.done) break
        const decision = step.value
        decisions.push(decision)
        next = undefined
        if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
            next = {
                id: decision.toolCall.id,
                name: decision.toolCall.name,
                output: 'ok',
                isError: false
            }
        }
    }

    return decisions
}

function types(decisions: Array<StrategyDecision>): Array<string> {
    return decisions.map(d => d.type)
}

describe('ReActStrategy', () => {
    describe('execute() — text response', () => {
        it('yields MESSAGE_DELTA, MESSAGE, ITERATION, DONE in order', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('Hello!'))
            const decisions = await runStrategy(provider)
            expect(types(decisions)).toEqual([
                STRATEGY_DECISION.MESSAGE_DELTA,
                STRATEGY_DECISION.MESSAGE,
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.DONE
            ])
        })

        it('MESSAGE_DELTA delta matches provider text', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('Hello, World!'))
            const decisions = await runStrategy(provider)
            const deltaDecision = decisions[0]
            if (deltaDecision?.type !== STRATEGY_DECISION.MESSAGE_DELTA) {
                throw new Error('Expected MESSAGE_DELTA as first decision')
            }
            expect(deltaDecision.delta).toBe('Hello, World!')
        })

        it('MESSAGE content matches provider text', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('Final message'))
            const decisions = await runStrategy(provider)
            const msgDecision = decisions[1]
            if (msgDecision?.type !== STRATEGY_DECISION.MESSAGE) {
                throw new Error('Expected MESSAGE as second decision')
            }
            expect(msgDecision.content).toBe('Final message')
        })

        it('passes input messages to the generate function', async () => {
            const provider = makeProvider()
            provider.respondWith(textResponse('ok'))
            const captured: Array<Array<Message>> = []
            const generate: StrategyGenerateFunction = msgs => {
                captured.push(msgs)
                return provider.generateStream({ model: TEST_MODEL, messages: msgs })
            }
            const strategy = new ReActStrategy()
            const initialMessages: Array<Message> = [{ role: MESSAGE_ROLE.USER, content: 'test input' }]
            const gen = strategy.execute({ messages: [...initialMessages], generate })
            while (!(await gen.next()).done);
            expect(captured).toHaveLength(1)
            const firstCall = captured[0]
            expect(firstCall?.some(m => m.content === 'test input')).toBe(true)
        })
    })

    describe('execute() — tool call', () => {
        it('yields TOOL_CALL_START before TOOL_CALL', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', { q: 'test' }))
            provider.respondWith(textResponse('done'))
            const decisions = await runStrategy(provider)
            expect(decisions.some(d => d.type === STRATEGY_DECISION.TOOL_CALL_START)).toBe(true)
            const startIdx = decisions.findIndex(d => d.type === STRATEGY_DECISION.TOOL_CALL_START)
            const callIdx = decisions.findIndex(d => d.type === STRATEGY_DECISION.TOOL_CALL)
            expect(startIdx).toBeLessThan(callIdx)
        })

        it('TOOL_CALL decision carries correct tool name', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', { q: 'test' }))
            provider.respondWith(textResponse('done'))
            const decisions = await runStrategy(provider)
            const toolCallDecision = decisions.find(d => d.type === STRATEGY_DECISION.TOOL_CALL)
            if (toolCallDecision?.type !== STRATEGY_DECISION.TOOL_CALL) {
                throw new Error('Expected TOOL_CALL decision')
            }
            expect(toolCallDecision.toolCall.name).toBe('search')
        })

        it('TOOL_CALL decision carries parsed arguments', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', { q: 'test', limit: 5 }))
            provider.respondWith(textResponse('done'))
            const decisions = await runStrategy(provider)
            const toolCallDecision = decisions.find(d => d.type === STRATEGY_DECISION.TOOL_CALL)
            if (toolCallDecision?.type !== STRATEGY_DECISION.TOOL_CALL) {
                throw new Error('Expected TOOL_CALL decision')
            }
            expect(toolCallDecision.toolCall.arguments).toEqual({ q: 'test', limit: 5 })
        })

        it('yields ITERATION after tool call', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', {}))
            provider.respondWith(textResponse('done'))
            const decisions = await runStrategy(provider)
            const callIdx = decisions.findIndex(d => d.type === STRATEGY_DECISION.TOOL_CALL)
            const iterIdx = decisions.findIndex(d => d.type === STRATEGY_DECISION.ITERATION)
            expect(callIdx).toBeLessThan(iterIdx)
        })

        it('continues to next iteration after tool call and ends with DONE', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', {}))
            provider.respondWith(textResponse('done'))
            const decisions = await runStrategy(provider)
            const lastDecision = decisions[decisions.length - 1]
            expect(lastDecision?.type).toBe(STRATEGY_DECISION.DONE)
        })

        it('sends tool result messages to generate on next iteration', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', {}))
            provider.respondWith(textResponse('response'))
            const callCounts: Array<number> = []
            const generate: StrategyGenerateFunction = msgs => {
                callCounts.push(msgs.length)
                return provider.generateStream({ model: TEST_MODEL, messages: msgs })
            }
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            let next: ToolResult | undefined = undefined
            while (true) {
                const step = await gen.next(next)
                if (step.done) break
                const decision = step.value
                next = undefined
                if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
                    next = { id: decision.toolCall.id, name: decision.toolCall.name, output: 'result', isError: false }
                }
            }
            const firstCount = callCounts[0]
            const secondCount = callCounts[1]
            if (firstCount === undefined || secondCount === undefined) throw new Error('Expected two generate calls')
            expect(secondCount).toBeGreaterThan(firstCount)
        })

        it('handles multiple tool calls in one response', async () => {
            const provider = makeProvider()
            provider.respondWith(
                toolCallsResponse([
                    { name: 'tool_a', args: {} },
                    { name: 'tool_b', args: {} }
                ])
            )
            provider.respondWith(textResponse('done'))
            const decisions = await runStrategy(provider)
            const toolCallDecisions = decisions.filter(d => d.type === STRATEGY_DECISION.TOOL_CALL)
            expect(toolCallDecisions).toHaveLength(2)
        })

        it('yields DONE after all decisions in multi-turn run', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('a', {}))
            provider.respondWith(textResponse('result'))
            const decisions = await runStrategy(provider)
            expect(decisions.some(d => d.type === STRATEGY_DECISION.DONE)).toBe(true)
        })
    })

    describe('execute() — done tool', () => {
        it('yields DONE after "done" tool without further generate calls', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('done', {}))
            const decisions = await runStrategy(provider)
            expect(types(decisions)).toEqual([
                STRATEGY_DECISION.TOOL_CALL_START,
                STRATEGY_DECISION.TOOL_CALL,
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.DONE
            ])
        })

        it('only calls generate once for done tool', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('done', {}))
            let generateCallCount = 0
            const generate: StrategyGenerateFunction = msgs => {
                generateCallCount++
                return provider.generateStream({ model: TEST_MODEL, messages: msgs })
            }
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            let next: ToolResult | undefined = undefined
            while (true) {
                const step = await gen.next(next)
                if (step.done) break
                const decision = step.value
                next = undefined
                if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
                    next = { id: decision.toolCall.id, name: decision.toolCall.name, output: 'ok', isError: false }
                }
            }
            expect(generateCallCount).toBe(1)
        })
    })

    describe('execute() — multiple rounds', () => {
        it('full event sequence for tool call followed by text response', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', { q: 'test' }))
            provider.respondWith(textResponse('Search results.'))
            const decisions = await runStrategy(provider)
            expect(types(decisions)).toEqual([
                STRATEGY_DECISION.TOOL_CALL_START,
                STRATEGY_DECISION.TOOL_CALL,
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.MESSAGE_DELTA,
                STRATEGY_DECISION.MESSAGE,
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.DONE
            ])
        })
    })

    describe('execute() — thinking content', () => {
        function makeThinkingGenerate(thinkingText: string, responseText: string): StrategyGenerateFunction {
            return _msgs =>
                (async function* (): AsyncIterable<StreamChunk> {
                    yield {
                        state: 'streaming',
                        delta: { content: [{ type: CONTENT_TYPE.THINKING, thinking: thinkingText }] }
                    }
                    yield {
                        state: 'streaming',
                        delta: { content: [{ type: CONTENT_TYPE.TEXT, text: responseText }] }
                    }
                    yield {
                        state: 'done',
                        finishReason: FINISH_REASON.STOP,
                        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                    }
                })()
        }

        async function runWithGenerate(generate: StrategyGenerateFunction): Promise<Array<StrategyDecision>> {
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            const decisions: Array<StrategyDecision> = []
            while (true) {
                const step = await gen.next(undefined)
                if (step.done) break
                decisions.push(step.value)
            }
            return decisions
        }

        it('yields THINKING_DELTA for thinking content', async () => {
            const generate = makeThinkingGenerate('My thoughts', 'Answer')
            const decisions = await runWithGenerate(generate)
            expect(decisions.some(d => d.type === STRATEGY_DECISION.THINKING_DELTA)).toBe(true)
        })

        it('THINKING_DELTA carries the thinking text as delta', async () => {
            const generate = makeThinkingGenerate('My thoughts', 'Answer')
            const decisions = await runWithGenerate(generate)
            const thinkingDelta = decisions.find(d => d.type === STRATEGY_DECISION.THINKING_DELTA)
            if (thinkingDelta?.type !== STRATEGY_DECISION.THINKING_DELTA) {
                throw new Error('Expected THINKING_DELTA decision')
            }
            expect(thinkingDelta.delta).toBe('My thoughts')
        })

        it('yields THINKING with full buffer after thinking stream ends', async () => {
            const generate = makeThinkingGenerate('Thinking content', 'Answer')
            const decisions = await runWithGenerate(generate)
            expect(decisions.some(d => d.type === STRATEGY_DECISION.THINKING)).toBe(true)
        })

        it('THINKING decision carries full thinking text', async () => {
            const generate = makeThinkingGenerate('Full thought', 'Answer')
            const decisions = await runWithGenerate(generate)
            const thinking = decisions.find(d => d.type === STRATEGY_DECISION.THINKING)
            if (thinking?.type !== STRATEGY_DECISION.THINKING) {
                throw new Error('Expected THINKING decision')
            }
            expect(thinking.thinking).toBe('Full thought')
        })

        it('flushes thinking before yielding MESSAGE for text that follows', async () => {
            const generate = makeThinkingGenerate('Thought', 'Reply')
            const decisions = await runWithGenerate(generate)
            const thinkingIdx = decisions.findIndex(d => d.type === STRATEGY_DECISION.THINKING)
            const msgDeltaIdx = decisions.findIndex(d => d.type === STRATEGY_DECISION.MESSAGE_DELTA)
            expect(thinkingIdx).toBeGreaterThanOrEqual(0)
            expect(msgDeltaIdx).toBeGreaterThan(thinkingIdx)
        })

        it('full decision sequence for thinking followed by text', async () => {
            const generate = makeThinkingGenerate('thinking', 'answer')
            const decisions = await runWithGenerate(generate)
            expect(types(decisions)).toEqual([
                STRATEGY_DECISION.THINKING_DELTA,
                STRATEGY_DECISION.THINKING,
                STRATEGY_DECISION.MESSAGE_DELTA,
                STRATEGY_DECISION.MESSAGE,
                STRATEGY_DECISION.ITERATION,
                STRATEGY_DECISION.DONE
            ])
        })
    })

    describe('execute() — state transitions (flush on switch)', () => {
        it('flushes buffered text as MESSAGE when thinking content follows', async () => {
            const generate: StrategyGenerateFunction = _msgs =>
                (async function* (): AsyncIterable<StreamChunk> {
                    yield { state: 'streaming', delta: { content: [{ type: CONTENT_TYPE.TEXT, text: 'Before' }] } }
                    yield {
                        state: 'streaming',
                        delta: { content: [{ type: CONTENT_TYPE.THINKING, thinking: 'Hmm...' }] }
                    }
                    yield {
                        state: 'done',
                        finishReason: FINISH_REASON.STOP,
                        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                    }
                })()
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            const decisions: Array<StrategyDecision> = []
            while (true) {
                const step = await gen.next(undefined)
                if (step.done) break
                decisions.push(step.value)
            }
            const messageDecisions = decisions.filter(d => d.type === STRATEGY_DECISION.MESSAGE)
            expect(messageDecisions).toHaveLength(1)
            const msg = messageDecisions[0]
            if (msg?.type !== STRATEGY_DECISION.MESSAGE) throw new Error()
            expect(msg.content).toBe('Before')
            expect(decisions.some(d => d.type === STRATEGY_DECISION.THINKING_DELTA)).toBe(true)
        })

        it('flushes buffered text as MESSAGE when tool call follows', async () => {
            let callIndex = 0
            const generate: StrategyGenerateFunction = _msgs => {
                callIndex++
                if (callIndex === 1) {
                    return (async function* (): AsyncIterable<StreamChunk> {
                        yield {
                            state: 'streaming',
                            delta: { content: [{ type: CONTENT_TYPE.TEXT, text: 'Searching...' }] }
                        }
                        yield {
                            state: 'streaming',
                            delta: {
                                content: [
                                    {
                                        type: CONTENT_TYPE.TOOL_CALL,
                                        toolCall: { index: 0, id: 'c-1', function: { name: 'search', arguments: '{}' } }
                                    }
                                ]
                            }
                        }
                        yield {
                            state: 'done',
                            finishReason: FINISH_REASON.TOOL_CALLS,
                            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                        }
                    })()
                }
                return (async function* (): AsyncIterable<StreamChunk> {
                    yield { state: 'streaming', delta: { content: [{ type: CONTENT_TYPE.TEXT, text: 'done' }] } }
                    yield {
                        state: 'done',
                        finishReason: FINISH_REASON.STOP,
                        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                    }
                })()
            }
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            const decisions: Array<StrategyDecision> = []
            let next: ToolResult | undefined = undefined
            while (true) {
                const step = await gen.next(next)
                if (step.done) break
                const decision = step.value
                decisions.push(decision)
                next = undefined
                if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
                    next = { id: decision.toolCall.id, name: decision.toolCall.name, output: 'ok', isError: false }
                }
            }
            const messageDecisions = decisions.filter(d => d.type === STRATEGY_DECISION.MESSAGE)
            expect(messageDecisions.some(d => d.content === 'Searching...')).toBe(true)
        })

        it('flushes buffered thinking as THINKING when tool call follows', async () => {
            let callIndex = 0
            const generate: StrategyGenerateFunction = _msgs => {
                callIndex++
                if (callIndex === 1) {
                    return (async function* (): AsyncIterable<StreamChunk> {
                        yield {
                            state: 'streaming',
                            delta: { content: [{ type: CONTENT_TYPE.THINKING, thinking: 'Consider this...' }] }
                        }
                        yield {
                            state: 'streaming',
                            delta: {
                                content: [
                                    {
                                        type: CONTENT_TYPE.TOOL_CALL,
                                        toolCall: { index: 0, id: 'c-1', function: { name: 'search', arguments: '{}' } }
                                    }
                                ]
                            }
                        }
                        yield {
                            state: 'done',
                            finishReason: FINISH_REASON.TOOL_CALLS,
                            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                        }
                    })()
                }
                return (async function* (): AsyncIterable<StreamChunk> {
                    yield { state: 'streaming', delta: { content: [{ type: CONTENT_TYPE.TEXT, text: 'done' }] } }
                    yield {
                        state: 'done',
                        finishReason: FINISH_REASON.STOP,
                        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                    }
                })()
            }
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            const decisions: Array<StrategyDecision> = []
            let next: ToolResult | undefined = undefined
            while (true) {
                const step = await gen.next(next)
                if (step.done) break
                const decision = step.value
                decisions.push(decision)
                next = undefined
                if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
                    next = { id: decision.toolCall.id, name: decision.toolCall.name, output: 'ok', isError: false }
                }
            }
            const thinkingDecisions = decisions.filter(d => d.type === STRATEGY_DECISION.THINKING)
            expect(thinkingDecisions).toHaveLength(1)
            const th = thinkingDecisions[0]
            if (th?.type !== STRATEGY_DECISION.THINKING) throw new Error()
            expect(th.thinking).toBe('Consider this...')
        })

        it('parses invalid JSON tool call arguments as empty object', async () => {
            let callIndex = 0
            const generate: StrategyGenerateFunction = _msgs => {
                callIndex++
                if (callIndex === 1) {
                    return (async function* (): AsyncIterable<StreamChunk> {
                        yield {
                            state: 'streaming',
                            delta: {
                                content: [
                                    {
                                        type: CONTENT_TYPE.TOOL_CALL,
                                        toolCall: {
                                            index: 0,
                                            id: 'c-1',
                                            function: { name: 'search', arguments: 'INVALID JSON' }
                                        }
                                    }
                                ]
                            }
                        }
                        yield {
                            state: 'done',
                            finishReason: FINISH_REASON.TOOL_CALLS,
                            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                        }
                    })()
                }
                return (async function* (): AsyncIterable<StreamChunk> {
                    yield { state: 'streaming', delta: { content: [{ type: CONTENT_TYPE.TEXT, text: 'done' }] } }
                    yield {
                        state: 'done',
                        finishReason: FINISH_REASON.STOP,
                        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                    }
                })()
            }
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            const decisions: Array<StrategyDecision> = []
            let next: ToolResult | undefined = undefined
            while (true) {
                const step = await gen.next(next)
                if (step.done) break
                const decision = step.value
                decisions.push(decision)
                next = undefined
                if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
                    next = { id: decision.toolCall.id, name: decision.toolCall.name, output: 'ok', isError: false }
                }
            }
            const toolCallDecision = decisions.find(d => d.type === STRATEGY_DECISION.TOOL_CALL)
            if (toolCallDecision?.type !== STRATEGY_DECISION.TOOL_CALL) {
                throw new Error('Expected TOOL_CALL decision')
            }
            expect(toolCallDecision.toolCall.arguments).toEqual({})
        })
    })

    describe('execute() — edge cases', () => {
        it('generates a random id and empty name when the tool call chunk omits both', async () => {
            let callIndex = 0
            const generate: StrategyGenerateFunction = _msgs => {
                callIndex++
                if (callIndex === 1) {
                    return (async function* (): AsyncIterable<StreamChunk> {
                        yield {
                            state: 'streaming',
                            delta: {
                                content: [
                                    {
                                        type: CONTENT_TYPE.TOOL_CALL,
                                        toolCall: { index: 0, function: { arguments: '{}' } }
                                    }
                                ]
                            }
                        }
                        yield { state: 'done', finishReason: FINISH_REASON.TOOL_CALLS }
                    })()
                }
                return (async function* (): AsyncIterable<StreamChunk> {
                    yield { state: 'streaming', delta: { content: [{ type: CONTENT_TYPE.TEXT, text: 'done' }] } }
                    yield { state: 'done', finishReason: FINISH_REASON.STOP }
                })()
            }
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            const decisions: Array<StrategyDecision> = []
            let next: ToolResult | undefined = undefined
            while (true) {
                const step = await gen.next(next)
                if (step.done) break
                const decision = step.value
                decisions.push(decision)
                next = undefined
                if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
                    next = { id: decision.toolCall.id, name: decision.toolCall.name, output: 'ok', isError: false }
                }
            }
            const start = decisions.find(d => d.type === STRATEGY_DECISION.TOOL_CALL_START)
            if (start?.type !== STRATEGY_DECISION.TOOL_CALL_START) throw new Error('Expected TOOL_CALL_START')
            expect(start.toolCallId.length).toBeGreaterThan(0)
            expect(start.toolName).toBe('')
        })

        it('does not set usage when the done chunk omits it', async () => {
            const generate: StrategyGenerateFunction = _msgs =>
                (async function* (): AsyncIterable<StreamChunk> {
                    yield { state: 'streaming', delta: { content: [{ type: CONTENT_TYPE.TEXT, text: 'ok' }] } }
                    yield { state: 'done', finishReason: FINISH_REASON.STOP }
                })()
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            const decisions: Array<StrategyDecision> = []
            while (true) {
                const step = await gen.next(undefined)
                if (step.done) break
                decisions.push(step.value)
            }
            const iteration = decisions.find(d => d.type === STRATEGY_DECISION.ITERATION)
            if (iteration?.type !== STRATEGY_DECISION.ITERATION) throw new Error('Expected ITERATION decision')
            expect(iteration.usage).toBeUndefined()
        })

        it('skips streaming chunks whose delta has no content', async () => {
            const generate: StrategyGenerateFunction = _msgs =>
                (async function* (): AsyncIterable<StreamChunk> {
                    yield { state: 'streaming', delta: {} }
                    yield { state: 'streaming', delta: { content: [{ type: CONTENT_TYPE.TEXT, text: 'ok' }] } }
                    yield { state: 'done', finishReason: FINISH_REASON.STOP }
                })()
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            const decisions: Array<StrategyDecision> = []
            while (true) {
                const step = await gen.next(undefined)
                if (step.done) break
                decisions.push(step.value)
            }
            const message = decisions.find(d => d.type === STRATEGY_DECISION.MESSAGE)
            if (message?.type !== STRATEGY_DECISION.MESSAGE) throw new Error('Expected MESSAGE decision')
            expect(message.content).toBe('ok')
        })

        it('throws AgentUnexpectedError when resumed without a tool result', async () => {
            const provider = makeProvider()
            provider.respondWith(toolCallResponse('search', {}))
            const generate: StrategyGenerateFunction = msgs =>
                provider.generateStream({ model: TEST_MODEL, messages: msgs })
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })

            let step = await gen.next(undefined)
            while (!step.done && step.value.type !== STRATEGY_DECISION.TOOL_CALL) {
                step = await gen.next(undefined)
            }
            expect(step.done).toBe(false)

            await expect(gen.next(undefined)).rejects.toThrow('Expected a tool result when resuming')
        })

        it('treats a parsed array as empty arguments', async () => {
            let callIndex = 0
            const generate: StrategyGenerateFunction = _msgs => {
                callIndex++
                if (callIndex === 1) {
                    return (async function* (): AsyncIterable<StreamChunk> {
                        yield {
                            state: 'streaming',
                            delta: {
                                content: [
                                    {
                                        type: CONTENT_TYPE.TOOL_CALL,
                                        toolCall: {
                                            index: 0,
                                            id: 'c-1',
                                            function: { name: 'search', arguments: '[1,2,3]' }
                                        }
                                    }
                                ]
                            }
                        }
                        yield { state: 'done', finishReason: FINISH_REASON.TOOL_CALLS }
                    })()
                }
                return (async function* (): AsyncIterable<StreamChunk> {
                    yield { state: 'streaming', delta: { content: [{ type: CONTENT_TYPE.TEXT, text: 'done' }] } }
                    yield { state: 'done', finishReason: FINISH_REASON.STOP }
                })()
            }
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            const decisions: Array<StrategyDecision> = []
            let next: ToolResult | undefined = undefined
            while (true) {
                const step = await gen.next(next)
                if (step.done) break
                const decision = step.value
                decisions.push(decision)
                next = undefined
                if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
                    next = { id: decision.toolCall.id, name: decision.toolCall.name, output: 'ok', isError: false }
                }
            }
            const toolCallDecision = decisions.find(d => d.type === STRATEGY_DECISION.TOOL_CALL)
            if (toolCallDecision?.type !== STRATEGY_DECISION.TOOL_CALL) throw new Error('Expected TOOL_CALL decision')
            expect(toolCallDecision.toolCall.arguments).toEqual({})
        })
    })

    describe('execute() — TOOL_CALL_DELTA', () => {
        function makeTwoChunkToolCallGenerate(): StrategyGenerateFunction {
            let callIndex = 0
            return _msgs => {
                callIndex++
                if (callIndex === 1) {
                    return (async function* (): AsyncIterable<StreamChunk> {
                        yield {
                            state: 'streaming',
                            delta: {
                                content: [
                                    {
                                        type: CONTENT_TYPE.TOOL_CALL,
                                        toolCall: { index: 0, id: 'c-1', function: { name: 'search', arguments: '' } }
                                    }
                                ]
                            }
                        }
                        yield {
                            state: 'streaming',
                            delta: {
                                content: [
                                    {
                                        type: CONTENT_TYPE.TOOL_CALL,
                                        toolCall: { index: 0, function: { arguments: '{"q":"test"}' } }
                                    }
                                ]
                            }
                        }
                        yield {
                            state: 'done',
                            finishReason: FINISH_REASON.TOOL_CALLS,
                            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                        }
                    })()
                }
                return (async function* (): AsyncIterable<StreamChunk> {
                    yield {
                        state: 'streaming',
                        delta: { content: [{ type: CONTENT_TYPE.TEXT, text: 'done' }] }
                    }
                    yield {
                        state: 'done',
                        finishReason: FINISH_REASON.STOP,
                        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
                    }
                })()
            }
        }

        it('yields TOOL_CALL_DELTA when same tool call index appears in multiple chunks', async () => {
            const generate = makeTwoChunkToolCallGenerate()
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            const decisions: Array<StrategyDecision> = []
            let next: ToolResult | undefined = undefined
            while (true) {
                const step = await gen.next(next)
                if (step.done) break
                const decision = step.value
                decisions.push(decision)
                next = undefined
                if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
                    next = { id: decision.toolCall.id, name: decision.toolCall.name, output: 'ok', isError: false }
                }
            }
            expect(decisions.some(d => d.type === STRATEGY_DECISION.TOOL_CALL_DELTA)).toBe(true)
        })

        it('TOOL_CALL_DELTA has the arguments fragment', async () => {
            const generate = makeTwoChunkToolCallGenerate()
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            const decisions: Array<StrategyDecision> = []
            let next: ToolResult | undefined = undefined
            while (true) {
                const step = await gen.next(next)
                if (step.done) break
                const decision = step.value
                decisions.push(decision)
                next = undefined
                if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
                    next = { id: decision.toolCall.id, name: decision.toolCall.name, output: 'ok', isError: false }
                }
            }
            const delta = decisions.find(d => d.type === STRATEGY_DECISION.TOOL_CALL_DELTA)
            if (delta?.type !== STRATEGY_DECISION.TOOL_CALL_DELTA) {
                throw new Error('Expected TOOL_CALL_DELTA')
            }
            expect(delta.argumentsDelta).toBe('{"q":"test"}')
        })

        it('TOOL_CALL decision accumulates arguments from both chunks', async () => {
            const generate = makeTwoChunkToolCallGenerate()
            const strategy = new ReActStrategy()
            const gen = strategy.execute({ messages: [{ role: MESSAGE_ROLE.USER, content: 'q' }], generate })
            const decisions: Array<StrategyDecision> = []
            let next: ToolResult | undefined = undefined
            while (true) {
                const step = await gen.next(next)
                if (step.done) break
                const decision = step.value
                decisions.push(decision)
                next = undefined
                if (decision.type === STRATEGY_DECISION.TOOL_CALL) {
                    next = { id: decision.toolCall.id, name: decision.toolCall.name, output: 'ok', isError: false }
                }
            }
            const toolCall = decisions.find(d => d.type === STRATEGY_DECISION.TOOL_CALL)
            if (toolCall?.type !== STRATEGY_DECISION.TOOL_CALL) {
                throw new Error('Expected TOOL_CALL')
            }
            expect(toolCall.toolCall.arguments).toEqual({ q: 'test' })
        })
    })
})
