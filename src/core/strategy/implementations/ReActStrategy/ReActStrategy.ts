import { randomUUID } from 'crypto'
import { CONTENT_TYPE, Message, StreamChunk, ToolCallDelta, Usage } from '@provider'
import { AgentUnexpectedError } from '@agent/errors'
import { ToolCall, ToolCallBuffer, ToolResult } from '@tool'
import { ThinkingStrategyInterface } from '../../interfaces'
import {
    STRATEGY_DECISION,
    StrategyDecision,
    StrategyInput,
    STREAM_STATE,
    StreamState,
    ToolCallDecision
} from '../../types'
import { appendToolCallMessage, appendToolResultMessage } from '../../utils'
import { REACT_STRATEGY_SYSTEM_PROMPT } from './prompts'

export class ReActStrategy implements ThinkingStrategyInterface {
    readonly name = 'ReAct'
    readonly systemPrompt = REACT_STRATEGY_SYSTEM_PROMPT

    async *execute(input: StrategyInput): AsyncGenerator<StrategyDecision, void, ToolResult | undefined> {
        const messages: Array<Message> = [...input.messages]

        while (true) {
            const stream = input.generate(messages)
            const iterationResult = yield* this.processStream(stream, messages)

            if (iterationResult === 'done') {
                return
            }
        }
    }

    private async *processStream(
        stream: AsyncIterable<StreamChunk>,
        messages: Array<Message>
    ): AsyncGenerator<StrategyDecision, 'done' | 'continue', ToolResult | undefined> {
        let thinkingBuffer = ''
        let textBuffer = ''
        const toolCallBuffers = new Map<number, ToolCallBuffer>()
        let currentState: StreamState = STREAM_STATE.IDLE
        let usage: Usage | null = null

        const flushThinking = function* (): Iterable<StrategyDecision> {
            if (!thinkingBuffer) return
            yield { type: STRATEGY_DECISION.THINKING, thinking: thinkingBuffer }
            thinkingBuffer = ''
        }

        const flushMessage = function* (): Iterable<StrategyDecision> {
            if (!textBuffer) return
            yield { type: STRATEGY_DECISION.MESSAGE, content: textBuffer }
            textBuffer = ''
        }

        const handleThinkingChunk = function* (delta: string): Iterable<StrategyDecision> {
            thinkingBuffer += delta
            yield { type: STRATEGY_DECISION.THINKING_DELTA, delta }
        }

        const handleTextChunk = function* (delta: string): Iterable<StrategyDecision> {
            textBuffer += delta
            yield { type: STRATEGY_DECISION.MESSAGE_DELTA, delta }
        }

        const handleToolCallChunk = function* (part: ToolCallDelta): Iterable<StrategyDecision> {
            const { index, id, function: fn } = part.toolCall
            const existing = toolCallBuffers.get(index)

            if (existing) {
                existing.arguments += fn.arguments
                yield {
                    type: STRATEGY_DECISION.TOOL_CALL_DELTA,
                    toolCallId: existing.id,
                    argumentsDelta: fn.arguments
                }
            } else {
                const toolCallId = id ?? randomUUID()
                toolCallBuffers.set(index, {
                    id: toolCallId,
                    name: fn.name ?? '',
                    arguments: fn.arguments
                })
                yield {
                    type: STRATEGY_DECISION.TOOL_CALL_START,
                    toolCallId,
                    toolName: fn.name ?? ''
                }
            }
        }

        for await (const chunk of stream) {
            if (chunk.state === 'done') {
                if (chunk.usage != null) {
                    usage = chunk.usage
                }
                continue
            }

            const { content } = chunk.delta
            if (!content) continue

            for (const part of content) {
                if (part.type === CONTENT_TYPE.THINKING) {
                    if (currentState === STREAM_STATE.MESSAGE) {
                        yield* flushMessage()
                    }
                    currentState = STREAM_STATE.THINKING
                    yield* handleThinkingChunk(part.thinking)
                }

                if (part.type === CONTENT_TYPE.TEXT) {
                    if (currentState === STREAM_STATE.THINKING) {
                        yield* flushThinking()
                    }
                    currentState = STREAM_STATE.MESSAGE
                    yield* handleTextChunk(part.text)
                }

                if (part.type === CONTENT_TYPE.TOOL_CALL) {
                    if (currentState === STREAM_STATE.THINKING) {
                        yield* flushThinking()
                    }
                    if (currentState === STREAM_STATE.MESSAGE) {
                        yield* flushMessage()
                    }
                    currentState = STREAM_STATE.TOOL_CALL
                    yield* handleToolCallChunk(part)
                }
            }
        }

        yield* flushThinking()
        yield* flushMessage()

        if (toolCallBuffers.size > 0) {
            const toolCalls: Array<ToolCall> = Array.from(toolCallBuffers.values()).map(tc => ({
                id: tc.id,
                name: tc.name,
                arguments: this.parseArguments(tc.arguments)
            }))

            for (const toolCall of toolCalls) {
                appendToolCallMessage(messages, toolCall)

                const decision: ToolCallDecision = {
                    type: STRATEGY_DECISION.TOOL_CALL,
                    toolCall
                }

                const toolResult = yield decision

                if (!toolResult) {
                    throw new AgentUnexpectedError('Expected a tool result when resuming after a tool call decision')
                }

                appendToolResultMessage(messages, toolCall, toolResult)

                if (toolCall.name === 'done') {
                    yield {
                        type: STRATEGY_DECISION.ITERATION,
                        ...(usage != null && { usage })
                    }

                    yield {
                        type: STRATEGY_DECISION.DONE
                    }
                    return 'done' as const
                }
            }

            yield {
                type: STRATEGY_DECISION.ITERATION,
                ...(usage != null && { usage })
            }

            return 'continue' as const
        }

        yield {
            type: STRATEGY_DECISION.ITERATION,
            ...(usage != null && { usage })
        }

        yield {
            type: STRATEGY_DECISION.DONE
        }

        return 'done' as const
    }

    private parseArguments(raw: string): Record<string, unknown> {
        try {
            const parsed: unknown = JSON.parse(raw)
            return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
                ? (parsed as Record<string, unknown>)
                : {}
        } catch {
            return {}
        }
    }
}
