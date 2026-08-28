import { GuardrailResolverInterface } from '../../interfaces'
import { GuardrailRequestDecision } from '../../types'

export class GuardrailResolverAggregator implements GuardrailResolverInterface {
    constructor(private readonly resolvers: Array<GuardrailResolverInterface>) {}

    resolve(requestId: string, decision: GuardrailRequestDecision): void {
        for (const resolver of this.resolvers) {
            resolver.resolve(requestId, decision)
        }
    }

    abort(sessionId: string): void {
        for (const resolver of this.resolvers) {
            resolver.abort(sessionId)
        }
    }
}
