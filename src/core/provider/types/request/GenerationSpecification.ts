import { CachePolicy } from './CachePolicy'
import { LogprobConfig } from './LogprobConfig'
import { Message } from '../Message'
import { ReasoningEffort } from './ReasoningEffort'
import { ResponseFormat } from './ResponseFormat'
import { SpecificationMetadata } from './SpecificationMetadata'
import { Tool } from './Tool'
import { ToolChoice } from './ToolChoice'

export type GenerationSpecification = {
    model: string
    messages: Array<Message>
    temperature?: number
    maxTokens?: number
    topP?: number
    topK?: number
    choicesCount?: number
    frequencyPenalty?: number
    presencePenalty?: number
    stopSequences?: Array<string>
    tools?: Array<Tool>
    toolChoice?: ToolChoice
    parallelToolCalls?: boolean
    responseFormat?: ResponseFormat
    reasoningEffort?: ReasoningEffort
    stream?: boolean
    timeoutMs?: number
    includeReasoning?: boolean
    logprobs?: LogprobConfig
    seed?: number
    cachePolicy?: CachePolicy
    metadata?: SpecificationMetadata
    extra?: Record<string, unknown>
}
