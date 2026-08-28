export type ProviderCapabilities = {
    supportsStreaming: boolean
    supportsTools: boolean
    supportsVision: boolean
    supportsAudio: boolean
    supportsVideo: boolean
    supportsJsonMode: boolean
    supportsJsonSchema: boolean
    supportsStrictToolSchema: boolean
    supportsReasoning: boolean
    supportsParallelToolCalls: boolean
    supportsCaching: boolean
    supportsLogprobs: boolean
    supportsSeed: boolean
    supportsMultipleChoices: boolean
    maxContextWindow: number
    maxOutputTokens: number
    maxReasoningTokens?: number
    maxChoicesCount: number
}
