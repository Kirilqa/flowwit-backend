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
    OpenAIChatCompletionRequest,
    OpenAIChatCompletionResponse,
    OpenAIChatCompletionStreamChunkResponse,
    OpenAIFinishReasonResponse,
    OpenAIMessageContentPartRequest,
    OpenAIMessageRequest,
    OpenAIMessageResponse,
    OpenAIResponseFormatRequest,
    OpenAIToolChoiceRequest,
    OpenAIToolRequest,
    OpenAIUsageResponse,
    OPENAI_TOOL_CHOICE_REQUEST,
    OpenAIMessageRole,
    OPENAI_MESSAGE_ROLE
} from '../types'

const mapContentPartToOpenAI = (part: MessageContentPart): OpenAIMessageContentPartRequest | null => {
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

const mapMessageRoleToOpenAI = (role: MessageRole): OpenAIMessageRole => {
    switch (role) {
        case MESSAGE_ROLE.SYSTEM:
            return OPENAI_MESSAGE_ROLE.SYSTEM

        case MESSAGE_ROLE.DEVELOPER:
            return OPENAI_MESSAGE_ROLE.DEVELOPER

        case MESSAGE_ROLE.USER:
            return OPENAI_MESSAGE_ROLE.USER

        case MESSAGE_ROLE.ASSISTANT:
            return OPENAI_MESSAGE_ROLE.ASSISTANT

        case MESSAGE_ROLE.TOOL_RESULT:
            return OPENAI_MESSAGE_ROLE.TOOL
    }
}

const mapMessageRoleFromOpenAI = (role: OpenAIMessageRole): MessageRole => {
    switch (role) {
        case OPENAI_MESSAGE_ROLE.SYSTEM:
            return MESSAGE_ROLE.SYSTEM

        case OPENAI_MESSAGE_ROLE.DEVELOPER:
            return MESSAGE_ROLE.DEVELOPER

        case OPENAI_MESSAGE_ROLE.USER:
            return MESSAGE_ROLE.USER

        case OPENAI_MESSAGE_ROLE.ASSISTANT:
            return MESSAGE_ROLE.ASSISTANT

        case OPENAI_MESSAGE_ROLE.TOOL:
            return MESSAGE_ROLE.TOOL_RESULT
    }
}

export const mapMessageToOpenAI = (message: Message): OpenAIMessageRequest => {
    const { role, content, name } = message

    if (typeof content === 'string') {
        const mappedRole = mapMessageRoleToOpenAI(role)
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

    const mappedRole = mapMessageRoleToOpenAI(role)

    const toolResult = content.find(part => part.type === CONTENT_TYPE.TOOL_RESULT)
    if (toolResult?.type === CONTENT_TYPE.TOOL_RESULT) {
        return {
            role: mappedRole,
            content: toolResult.toolResult.content,
            tool_call_id: toolResult.toolResult.id,
            ...(name !== undefined && { name })
        }
    }

    const mappedContent = content.map(mapContentPartToOpenAI).filter(part => part !== null)

    return {
        role: mappedRole,
        content: mappedContent.length ? mappedContent : null,
        ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
        ...(name !== undefined && { name })
    }
}

export const mapToolToOpenAI = (tool: Tool): OpenAIToolRequest => ({
    type: 'function',
    function: {
        name: tool.function.name,
        parameters: tool.function.parameters,
        ...(tool.function.description !== undefined && { description: tool.function.description }),
        ...(tool.function.strict !== undefined && { strict: tool.function.strict })
    }
})

export const mapToolChoiceToOpenAI = (toolChoice: ToolChoice): OpenAIToolChoiceRequest => {
    switch (toolChoice.type) {
        case 'none':
            return OPENAI_TOOL_CHOICE_REQUEST.NONE

        case 'auto':
            return OPENAI_TOOL_CHOICE_REQUEST.AUTO

        case 'required':
            return OPENAI_TOOL_CHOICE_REQUEST.REQUIRED

        case 'function':
            return {
                type: 'function',
                function: { name: toolChoice.function.name }
            }
    }
}

export const mapResponseFormatToOpenAI = (responseFormat: ResponseFormat): OpenAIResponseFormatRequest => {
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

export const mapSpecificationToOpenAI = (specification: GenerationSpecification): OpenAIChatCompletionRequest => ({
    model: specification.model,
    messages: specification.messages.map(mapMessageToOpenAI),
    ...(specification.temperature !== undefined && { temperature: specification.temperature }),
    ...(specification.maxTokens !== undefined && { max_completion_tokens: specification.maxTokens }),
    ...(specification.topP !== undefined && { top_p: specification.topP }),
    ...(specification.frequencyPenalty !== undefined && { frequency_penalty: specification.frequencyPenalty }),
    ...(specification.presencePenalty !== undefined && { presence_penalty: specification.presencePenalty }),
    ...(specification.stopSequences !== undefined && { stop: specification.stopSequences }),
    ...(specification.tools?.length && { tools: specification.tools.map(mapToolToOpenAI) }),
    ...(specification.toolChoice !== undefined && { tool_choice: mapToolChoiceToOpenAI(specification.toolChoice) }),
    ...(specification.parallelToolCalls !== undefined && { parallel_tool_calls: specification.parallelToolCalls }),
    ...(specification.responseFormat !== undefined && {
        response_format: mapResponseFormatToOpenAI(specification.responseFormat)
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

export const mapFinishReasonFromOpenAI = (finishReason: OpenAIFinishReasonResponse): FinishReason => {
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

export const mapUsageFromOpenAI = (usage: OpenAIUsageResponse): Usage => {
    return {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        ...(usage.completion_tokens_details?.reasoning_tokens !== undefined && {
            reasoningTokens: usage.completion_tokens_details.reasoning_tokens
        }),
        ...(usage.prompt_tokens_details?.cached_tokens !== undefined && {
            cacheReadTokens: usage.prompt_tokens_details.cached_tokens
        })
    }
}

export const mapMessageFromOpenAI = (message: OpenAIMessageResponse): Message => {
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

export const mapResponseFromOpenAI = (
    response: OpenAIChatCompletionResponse,
    provider: string,
    latencyMs: number
): GenerationResult => ({
    data: {
        id: response.id,
        model: response.model,
        choices: response.choices.map(choice => ({
            index: choice.index,
            message: mapMessageFromOpenAI(choice.message),
            finishReason: mapFinishReasonFromOpenAI(choice.finish_reason),
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
        usage: mapUsageFromOpenAI(response.usage)
    },
    meta: {
        provider,
        latencyMs,
        requestId: response.id
    }
})

export const mapStreamChunkFromOpenAI = (chunk: OpenAIChatCompletionStreamChunkResponse): StreamChunk | null => {
    const choice = chunk.choices[0]

    if (!choice) {
        if (chunk.usage) {
            return {
                state: 'done',
                finishReason: FINISH_REASON.STOP,
                usage: mapUsageFromOpenAI(chunk.usage)
            }
        }
        return null
    }

    if (choice.finish_reason !== null) {
        return {
            state: 'done',
            finishReason: mapFinishReasonFromOpenAI(choice.finish_reason),
            ...(chunk.usage !== undefined && chunk.usage !== null && { usage: mapUsageFromOpenAI(chunk.usage) })
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
            contentParts.push({
                type: CONTENT_TYPE.TOOL_CALL,
                toolCall: {
                    index: toolCall.index,
                    ...(toolCall.id !== undefined && { id: toolCall.id }),
                    function: {
                        ...(toolCall.function?.name !== undefined && { name: toolCall.function.name }),
                        arguments: toolCall.function?.arguments ?? ''
                    }
                }
            })
        }
    }

    const mappedRole = delta.role ? mapMessageRoleFromOpenAI(delta.role) : undefined

    return {
        state: 'streaming',
        delta: {
            ...(mappedRole !== undefined && { role: mappedRole }),
            ...(contentParts.length > 0 && { content: contentParts })
        }
    }
}
