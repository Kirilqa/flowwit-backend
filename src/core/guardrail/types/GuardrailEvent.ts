import { GuardrailRequestContext } from './GuardrailRequestContext'

export type GuardrailEvent = {
    requestId: string
    reason?: string
    context: GuardrailRequestContext
    createdAt: number
}
