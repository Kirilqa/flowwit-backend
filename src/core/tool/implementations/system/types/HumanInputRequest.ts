import { HumanInputOption } from './HumanInputOption'

export type HumanInputRequest = {
    id: string
    question: string
    options?: Array<HumanInputOption>
    timeoutMs?: number
    createdAt: number
}
