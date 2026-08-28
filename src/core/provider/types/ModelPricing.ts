export type ModelPricing = {
    inputPer1K: number
    outputPer1K: number
    cacheWritePer1K?: number
    cacheReadPer1K?: number
    reasoningPer1K?: number
    currency: 'USD'
}
