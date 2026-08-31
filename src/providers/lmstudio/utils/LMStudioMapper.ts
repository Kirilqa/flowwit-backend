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
    LMStudioChatCompletionRequest,
    LMStudioChatCompletionResponse,
    LMStudioChatCompletionStreamChunkResponse,
    LMStudioFinishReasonResponse,
    LMStudioMessageContentPartRequest,
    LMStudioMessageRequest,
    LMStudioMessageResponse,
    LMStudioResponseFormatRequest,
    LMStudioToolRequest,
    LMStudioUsageResponse,
    LMStudioMessageRole,
    LMSTUDIO_MESSAGE_ROLE
} from '../types'

const mapContentPartToLMStudio = (part: MessageContentPart): LMStudioMessageContentPartRequest | null => {
    switch (part.type) {
        case CONTENT_TYPE.TEXT:
            return { type: 'text', text: part.text }

        case CONTENT_TYPE.IMAGE_URL:
            if (!part.data) return null

            return {
                type: 'image_url',
                image_url: {
                    url: `data:${part.mimeType ?? 'image/jpeg'};base64,${encodeImageDataAsBase64(part.data)}`
                }
            }

        default:
            return null
    }
}

const mapMessageRoleToLMStudio = (role: MessageRole): LMStudioMessageRole => {
    switch (role) {
        case MESSAGE_ROLE.SYSTEM:
            return LMSTUDIO_MESSAGE_ROLE.SYSTEM

        case MESSAGE_ROLE.DEVELOPER:
            return LMSTUDIO_MESSAGE_ROLE.DEVELOPER

        case MESSAGE_ROLE.USER:
            return LMSTUDIO_MESSAGE_ROLE.USER

        case MESSAGE_ROLE.ASSISTANT:
            return LMSTUDIO_MESSAGE_ROLE.ASSISTANT

        case MESSAGE_ROLE.TOOL_RESULT:
            return LMSTUDIO_MESSAGE_ROLE.TOOL
    }
}

const mapMessageRoleFromLMStudio = (role: LMStudioMessageRole): MessageRole => {
    switch (role) {
        case LMSTUDIO_MESSAGE_ROLE.SYSTEM:
            return MESSAGE_ROLE.SYSTEM

        case LMSTUDIO_MESSAGE_ROLE.DEVELOPER:
            return MESSAGE_ROLE.DEVELOPER

        case LMSTUDIO_MESSAGE_ROLE.USER:
            return MESSAGE_ROLE.USER

        case LMSTUDIO_MESSAGE_ROLE.ASSISTANT:
            return MESSAGE_ROLE.ASSISTANT

        case LMSTUDIO_MESSAGE_ROLE.TOOL:
            return MESSAGE_ROLE.TOOL_RESULT
    }
}

export const mapMessageToLMStudio = (message: Message): LMStudioMessageRequest => {
    const { role, content, name } = message

    if (typeof content === 'string') {
        const mappedRole = mapMessageRoleToLMStudio(role)
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

    const mappedRole = mapMessageRoleToLMStudio(role)

    const toolResult = content.find(part => part.type === CONTENT_TYPE.TOOL_RESULT)
    if (toolResult?.type === CONTENT_TYPE.TOOL_RESULT) {
        return {
            role: mappedRole,
            content: toolResult.toolResult.content,
            tool_call_id: toolResult.toolResult.id,
            ...(name !== undefined && { name })
        }
    }

    const mappedContent = content.map(mapContentPartToLMStudio).filter(part => part !== null)

    return {
        role: mappedRole,
        content: mappedContent.length ? mappedContent : null,
        ...(toolCalls.length > 0 && { tool_calls: toolCalls }),
        ...(name !== undefined && { name })
    }
}

export const mapToolToLMStudio = (tool: Tool): LMStudioToolRequest => ({
    type: 'function',
    function: {
        name: tool.function.name,
        parameters: tool.function.parameters,
        ...(tool.function.description !== undefined && { description: tool.function.description })
    }
})

export const mapResponseFormatToLMStudio = (responseFormat: ResponseFormat): LMStudioResponseFormatRequest => {
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

export const mapSpecificationToLMStudio = (specification: GenerationSpecification): LMStudioChatCompletionRequest => ({
    model: specification.model,
    messages: specification.messages.map(mapMessageToLMStudio),
    ...(specification.temperature !== undefined && { temperature: specification.temperature }),
    ...(specification.maxTokens !== undefined && { max_tokens: specification.maxTokens }),
    ...(specification.topP !== undefined && { top_p: specification.topP }),
    ...(specification.frequencyPenalty !== undefined && { frequency_penalty: specification.frequencyPenalty }),
    ...(specification.presencePenalty !== undefined && { presence_penalty: specification.presencePenalty }),
    ...(specification.stopSequences !== undefined && { stop: specification.stopSequences }),
    ...(specification.tools?.length && { tools: specification.tools.map(mapToolToLMStudio) }),
    ...(specification.responseFormat !== undefined && {
        response_format: mapResponseFormatToLMStudio(specification.responseFormat)
    }),
    ...(specification.stream && { stream: true, stream_options: { include_usage: true } }),
    ...(specification.reasoningEffort !== undefined && { reasoning_effort: specification.reasoningEffort }),
    ...(specification.seed !== undefined && { seed: specification.seed })
})

export const mapFinishReasonFromLMStudio = (finishReason: LMStudioFinishReasonResponse): FinishReason => {
    switch (finishReason) {
        case 'stop':
            return FINISH_REASON.STOP

        case 'length':
            return FINISH_REASON.LENGTH

        case 'tool_calls':
            return FINISH_REASON.TOOL_CALLS

        default:
            return FINISH_REASON.STOP
    }
}

export const mapUsageFromLMStudio = (usage: LMStudioUsageResponse): Usage => ({
    promptTokens: usage.prompt_tokens,
    completionTokens: usage.completion_tokens,
    totalTokens: usage.total_tokens
})

export const mapMessageFromLMStudio = (message: LMStudioMessageResponse): Message => {
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

export const mapResponseFromLMStudio = (
    response: LMStudioChatCompletionResponse,
    provider: string,
    latencyMs: number
): GenerationResult => ({
    data: {
        id: response.id,
        model: response.model,
        choices: response.choices.map(choice => ({
            index: choice.index,
            message: mapMessageFromLMStudio(choice.message),
            finishReason: mapFinishReasonFromLMStudio(choice.finish_reason)
        })),
        usage: mapUsageFromLMStudio(response.usage)
    },
    meta: {
        provider,
        latencyMs,
        requestId: response.id
    }
})

export const mapStreamChunkFromLMStudio = (chunk: LMStudioChatCompletionStreamChunkResponse): StreamChunk | null => {
    const choice = chunk.choices[0]

    if (!choice) {
        if (chunk.usage) {
            return {
                state: 'done',
                finishReason: FINISH_REASON.STOP,
                usage: mapUsageFromLMStudio(chunk.usage)
            }
        }
        return null
    }

    if (choice.finish_reason !== null) {
        return {
            state: 'done',
            finishReason: mapFinishReasonFromLMStudio(choice.finish_reason),
            ...(chunk.usage !== undefined && chunk.usage !== null && { usage: mapUsageFromLMStudio(chunk.usage) })
        }
    }

    const { delta } = choice
    const contentParts: Array<TextDelta | ToolCallDelta | ThinkingDelta> = []

    if (delta.content) {
        contentParts.push({ type: CONTENT_TYPE.TEXT, text: delta.content })
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

    const mappedRole = delta.role ? mapMessageRoleFromLMStudio(delta.role) : undefined

    return {
        state: 'streaming',
        delta: {
            ...(mappedRole !== undefined && { role: mappedRole }),
            ...(contentParts.length > 0 && { content: contentParts })
        }
    }
}
