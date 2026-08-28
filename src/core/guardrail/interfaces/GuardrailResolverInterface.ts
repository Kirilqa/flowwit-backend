import { GuardrailRequestDecision } from '../types'

export interface GuardrailResolverInterface {
    resolve(requestId: string, decision: GuardrailRequestDecision): void
    abort(sessionId: string): void
}
