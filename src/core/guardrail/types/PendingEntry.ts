import { GuardrailRequestDecision } from './GuardrailRequestDecision'

export type PendingEntry = {
    sessionId: string
    resolve: (decision: GuardrailRequestDecision) => void
}
