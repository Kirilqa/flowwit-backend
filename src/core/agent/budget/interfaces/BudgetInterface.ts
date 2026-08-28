import { ModelPricing, Usage } from '@provider'
import { BudgetCheckResult } from '../types/BudgetCheckResult'
import { BudgetState } from '../types/BudgetState'

export interface BudgetInterface {
    initialize(pricing?: ModelPricing): void
    getState(): BudgetState

    trackTokens(usage: Usage): void
    trackToolCall(): void
    trackIteration(): void

    check(): BudgetCheckResult
}
