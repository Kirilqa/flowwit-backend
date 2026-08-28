export type OpenAITopLogprobResponse = {
    token: string
    logprob: number
    bytes: Array<number> | null
}
