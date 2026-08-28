import {
    CONTENT_TYPE,
    FINISH_REASON,
    FinishReason,
    GenerationResult,
    GenerationSpecification,
    Message,
    MessageContentPart,
    MESSAGE_ROLE,
    StreamChunk,
    Tool,
    ToolChoice,
    Usage,
    MessageRole,
    TextDelta,
    ToolCallDelta,
    ThinkingDelta,
    ResponseFormat,
    RESPONSE_FORMAT_TYPE,
    encodeImageDataAsBase64
} from '@provider'
import {
    OpenRouterChatCompletionRequest,
    OpenRouterChatCompletionResponse,
    OpenRouterChatCompletionStreamChunkResponse,
    OpenRouterFinishReasonResponse,
    OpenRouterMessageContentPartRequest,
    OpenRouterMessageRequest,
    OpenRouterMessageResponse,
    OpenRouterResponseFormatRequest,
    OpenRouterToolChoiceRequest,
    OpenRouterToolRequest,
    OpenRouterUsageResponse,
    OPENROUTER_TOOL_CHOICE_REQUEST,
    OpenRouterMessageRole,
    OPENROUTER_MESSAGE_ROLE
} from '../types'

const mapContentPartToOpenRouter = (part: MessageContentPart): OpenRouterMessageContentPartRequest | null => {
    switch (part.type) {
        case CONTENT_TYPE.TEXT:
            return { type: 'text', text: part.text }

        case CONTENT_TYPE.IMAGE_URL:
            return {
                type: 'image_url',
                image_url: {
                    url: part.data
                        ? `data:${part.mimeType ?? 'image/jpeg'};base64,${encodeImageDataAsBase64(part.data)}`
                        : part.url
                }
            }

        default:
            return null
    }
}

const mapMessageRoleToOpenRouter = (role: MessageRole): OpenRouterMessageRole => {
    switch (role) {
        case MESSAGE_ROLE.SYSTEM:
            return OPENROUTER_MESSAGE_ROLE.SYSTEM

        case MESSAGE_ROLE.DEVELOPER:
            return OPENROUTER_MESSAGE_ROLE.DEVELOPER

        case MESSAGE_ROLE.USER:
            return OPENROUTER_MESSAGE_ROLE.USER

        case MESSAGE_ROLE.ASSISTANT:
            return OPENROUTER_MESSAGE_ROLE.ASSISTANT

        case MESSAGE_ROLE.TOOL_RESULT:
            return OPENROUTER_MESSAGE_ROLE.TOOL
    }
}

const mapMessageRoleFromOpenRouter = (role: OpenRouterMessageRole): MessageRole => {
    switch (role) {
        case OPENROUTER_MESSAGE_ROLE.SYSTEM:
            return MESSAGE_ROLE.SYSTEM

        case OPENROUTER_MESSAGE_ROLE.DEVELOPER:
            return MESSAGE_ROLE.DEVELOPER

        case OPENROUTER_MESSAGE_ROLE.USER:
            return MESSAGE_ROLE.USER

        case OPENROUTER_MESSAGE_ROLE.ASSISTANT:
            return MESSAGE_ROLE.ASSISTANT

        case OPENROUTER_MESSAGE_ROLE.TOOL:
            return MESSAGE_ROLE.TOOL_RESULT
    }
}

export const mapMessageToOpenRouter = (message: Message): OpenRouterMessageRequest => {
    const { role, content, name } = message

    if (typeof content === 'string') {
        const mappedRole = mapMessageRoleToOpenRouter(role)
        return { role: mappedRole, content, ...(name !== undefined && { name }) }
    }

    const toolCalls = content
        .filter(part => part.type === CONTENT_TYPE.TOOL_CALL)
        .map(part => ({
            id: part.toolCall.id,
            type: 'function' as const,
            function: {
                name: part.toolCall.function.name,
                arguments: part.toolCall.function.arguments
            }
        }))

    const mappedRole = mapMessageRoleToOpenRouter(role)

    const toolResult = content.find(part => part.type === CONTENT_TYPE.TOOL_RESULT)
    if (toolResult?.type === CONTENT_TYPE.TOOL_RESULT) {
        return {
            role: mappedRole,
            content: toolResult.toolResult.content,
            tool_call_id: toolResult.toolResult.id,
            ...(name !== undefined && { name })
        }
    }

    const mappedContent = content.map(mapContentPartToOpenRouter).filter(part => part !== null)

    return {
        role: mappedRole,
        content: mappedContent.length ? mappedContent : null,
        ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
        ...(name !== undefined && { name })
    }
}

export const mapToolToOpenRouter = (tool: Tool): OpenRouterToolRequest => ({
    type: 'function',
    function: {
        name: tool.function.name,
        parameters: tool.function.parameters,
        ...(tool.function.description !== undefined && { description: tool.function.description }),
        ...(tool.function.strict !== undefined && { strict: tool.function.strict })
    }
})

export const mapToolChoiceToOpenRouter = (toolChoice: ToolChoice): OpenRouterToolChoiceRequest => {
    switch (toolChoice.type) {
        case 'none':
            return OPENROUTER_TOOL_CHOICE_REQUEST.NONE

        case 'auto':
            return OPENROUTER_TOOL_CHOICE_REQUEST.AUTO

        case 'required':
            return OPENROUTER_TOOL_CHOICE_REQUEST.REQUIRED

        case 'function':
            return {
                type: 'function',
                function: { name: toolChoice.function.name }
            }
    }
}

export const mapResponseFormatToOpenRouter = (responseFormat: ResponseFormat): OpenRouterResponseFormatRequest => {
    switch (responseFormat.type) {
        case RESPONSE_FORMAT_TYPE.TEXT:
            return { type: 'text' }

        case RESPONSE_FORMAT_TYPE.JSON_OBJECT:
            return { type: 'json_object' }

        case RESPONSE_FORMAT_TYPE.JSON_SCHEMA:
            return {
                type: 'json_schema',
                json_schema: {
                    name: responseFormat.name,
                    schema: responseFormat.jsonSchema,
                    strict: true
                }
            }
    }
}

export const mapSpecificationToOpenRouter = (
    specification: GenerationSpecification
): OpenRouterChatCompletionRequest => ({
    model: specification.model,
    messages: specification.messages.map(mapMessageToOpenRouter),
    ...(specification.temperature !== undefined && { temperature: specification.temperature }),
    ...(specification.maxTokens !== undefined && { max_completion_tokens: specification.maxTokens }),
    ...(specification.topP !== undefined && { top_p: specification.topP }),
    ...(specification.frequencyPenalty !== undefined && { frequency_penalty: specification.frequencyPenalty }),
    ...(specification.presencePenalty !== undefined && { presence_penalty: specification.presencePenalty }),
    ...(specification.stopSequences !== undefined && { stop: specification.stopSequences }),
    ...(specification.tools?.length && { tools: specification.tools.map(mapToolToOpenRouter) }),
    ...(specification.toolChoice !== undefined && { tool_choice: mapToolChoiceToOpenRouter(specification.toolChoice) }),
    ...(specification.parallelToolCalls !== undefined && { parallel_tool_calls: specification.parallelToolCalls }),
    ...(specification.responseFormat !== undefined && {
        response_format: mapResponseFormatToOpenRouter(specification.responseFormat)
    }),
    ...(specification.stream && { stream: true, stream_options: { include_usage: true } }),
    ...(specification.reasoningEffort !== undefined && { reasoning_effort: specification.reasoningEffort }),
    ...(specification.choicesCount !== undefined && { n: specification.choicesCount }),
    ...(specification.logprobs !== undefined && {
        logprobs: true,
        top_logprobs: specification.logprobs.topLogprobs
    }),
    ...(specification.seed !== undefined && { seed: specification.seed })
})

export const mapFinishReasonFromOpenRouter = (finishReason: OpenRouterFinishReasonResponse): FinishReason => {
    switch (finishReason) {
        case 'stop':
            return FINISH_REASON.STOP

        case 'length':
            return FINISH_REASON.LENGTH

        case 'tool_calls':
            return FINISH_REASON.TOOL_CALLS

        case 'content_filter':
            return FINISH_REASON.CONTENT_FILTER

        default:
            return FINISH_REASON.STOP
    }
}

export const mapUsageFromOpenRouter = (usage: OpenRouterUsageResponse): Usage => ({
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens,
    ...(usage.completion_tokens_details?.reasoning_tokens !== undefined && {
        reasoningTokens: usage.completion_tokens_details.reasoning_tokens
    }),
    ...(usage.prompt_tokens_details?.cached_tokens !== undefined && {
        cacheReadTokens: usage.prompt_tokens_details.cached_tokens
    })
})

export const mapMessageFromOpenRouter = (message: OpenRouterMessageResponse): Message => {
    const parts: Array<MessageContentPart> = []

    if (message.content) {
        parts.push({ type: CONTENT_TYPE.TEXT, text: message.content })
    }

    if (message.tool_calls?.length) {
        for (const toolCall of message.tool_calls) {
            parts.push({
                type: CONTENT_TYPE.TOOL_CALL,
                toolCall: {
                    id: toolCall.id,
                    function: {
                        name: toolCall.function.name,
                        arguments: toolCall.function.arguments
                    }
                }
            })
        }
    }

    return {
        role: MESSAGE_ROLE.ASSISTANT,
        content: parts
    }
}

export const mapResponseFromOpenRouter = (
    response: OpenRouterChatCompletionResponse,
    provider: string,
    latencyMs: number
): GenerationResult => ({
    data: {
        id: response.id,
        model: response.model,
        choices: response.choices.map(choice => ({
            index: choice.index,
            message: mapMessageFromOpenRouter(choice.message),
            finishReason: mapFinishReasonFromOpenRouter(choice.finish_reason),
            ...(choice.logprobs?.content && {
                logprobs: choice.logprobs.content.map(logprob => ({
                    token: logprob.token,
                    logprob: logprob.logprob,
                    bytes: logprob.bytes,
                    topLogprobs: logprob.top_logprobs.map(top => ({
                        token: top.token,
                        logprob: top.logprob,
                        bytes: top.bytes
                    }))
                }))
            }),
            ...(choice.message.reasoning_content && {
                reasoning: [{ type: CONTENT_TYPE.THINKING, thinking: choice.message.reasoning_content }]
            })
        })),
        usage: mapUsageFromOpenRouter(response.usage)
    },
    meta: {
        provider,
        latencyMs,
        requestId: response.id
    }
})

export const mapStreamChunkFromOpenRouter = (
    chunk: OpenRouterChatCompletionStreamChunkResponse
): StreamChunk | null => {
    const choice = chunk.choices[0]

    if (!choice) {
        if (chunk.usage) {
            return {
                state: 'done',
                usage: mapUsageFromOpenRouter(chunk.usage),
                finishReason: FINISH_REASON.STOP
            }
        }
        return null
    }

    if (choice.finish_reason !== null && !chunk.usage) {
        return null
    }

    if (choice.finish_reason !== null && chunk.usage) {
        return {
            state: 'done',
            usage: mapUsageFromOpenRouter(chunk.usage),
            finishReason: mapFinishReasonFromOpenRouter(choice.finish_reason)
        }
    }

    const { delta } = choice
    const contentParts: Array<TextDelta | ToolCallDelta | ThinkingDelta> = []

    if (delta.content) {
        contentParts.push({ type: CONTENT_TYPE.TEXT, text: delta.content })
    }

    if (delta.reasoning_content) {
        contentParts.push({ type: CONTENT_TYPE.THINKING, thinking: delta.reasoning_content })
    }

    if (delta.tool_calls?.length) {
        for (const toolCall of delta.tool_calls) {
            const toolCallFunction = toolCall.function

            contentParts.push({
                type: CONTENT_TYPE.TOOL_CALL,
                toolCall: {
                    index: toolCall.index,
                    ...(toolCall.id !== undefined && { id: toolCall.id }),
                    function: {
                        ...(toolCallFunction?.name !== undefined && { name: toolCallFunction.name }),
                        arguments: toolCallFunction?.arguments ?? ''
                    }
                }
            })
        }
    }

    const mappedRole = delta.role ? mapMessageRoleFromOpenRouter(delta.role) : undefined

    return {
        state: 'streaming',
        delta: {
            ...(mappedRole !== undefined && { role: mappedRole }),
            ...(contentParts.length > 0 && { content: contentParts })
        }
    }
}
