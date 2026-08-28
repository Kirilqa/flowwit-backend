export type TokenLogprob = {
    token: string
    logprob: number
    bytes: Array<number> | null
    topLogprobs: Array<{
        token: string
        logprob: number
        bytes: Array<number> | null
    }>
}
