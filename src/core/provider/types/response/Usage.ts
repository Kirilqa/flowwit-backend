export type Usage = {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    reasoningTokens?: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
}
