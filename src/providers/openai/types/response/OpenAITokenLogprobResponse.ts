import { OpenAITopLogprobResponse } from './OpenAITopLogprobResponse'

export type OpenAITokenLogprobResponse = {
    token: string
    logprob: number
    bytes: Array<number> | null
    top_logprobs: Array<OpenAITopLogprobResponse>
}
