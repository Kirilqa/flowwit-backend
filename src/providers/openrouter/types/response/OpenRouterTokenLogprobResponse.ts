import { OpenRouterTopLogprobResponse } from './OpenRouterTopLogprobResponse'

export type OpenRouterTokenLogprobResponse = {
    token: string
    logprob: number
    bytes: Array<number> | null
    top_logprobs: Array<OpenRouterTopLogprobResponse>
}
