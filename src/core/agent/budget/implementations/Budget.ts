import { ModelPricing, Usage } from '@provider'
import { BudgetInterface } from '../interfaces/BudgetInterface'
import { BudgetCheckResult } from '../types/BudgetCheckResult'
import { BudgetConfig } from '../types/BudgetConfig'
import { BudgetState } from '../types/BudgetState'

export class Budget implements BudgetInterface {
    private readonly config: BudgetConfig
    private pricing: ModelPricing | undefined = undefined

    private usedTokens = 0
    private usedIterations = 0
    private usedToolCalls = 0
    private usedCostUsd = 0
    private startedAt = 0

    constructor(config: BudgetConfig) {
        this.config = config
    }

    initialize(pricing?: ModelPricing): void {
        this.pricing = pricing

        this.usedTokens = 0
        this.usedIterations = 0
        this.usedToolCalls = 0
        this.usedCostUsd = 0
        this.startedAt = Date.now()
    }

    getState(): BudgetState {
        return {
            usedTokens: this.usedTokens,
            usedIterations: this.usedIterations,
            usedToolCalls: this.usedToolCalls,
            usedCostUsd: this.usedCostUsd,
            elapsedMs: Date.now() - this.startedAt
        }
    }

    trackTokens(usage: Usage): void {
        this.usedTokens += usage.totalTokens
        this.usedCostUsd += this.calculateCost(usage)
    }

    trackToolCall(): void {
        this.usedToolCalls += 1
    }

    trackIteration(): void {
        this.usedIterations += 1
    }

    check(): BudgetCheckResult {
        const elapsedMs = Date.now() - this.startedAt

        if (this.config.maxTokens !== undefined && this.usedTokens >= this.config.maxTokens) {
            return {
                exceeded: true,
                reason: `Token limit exceeded: ${this.usedTokens} / ${this.config.maxTokens}`
            }
        }

        if (this.config.maxIterations !== undefined && this.usedIterations >= this.config.maxIterations) {
            return {
                exceeded: true,
                reason: `Iteration limit exceeded: ${this.usedIterations} / ${this.config.maxIterations}`
            }
        }

        if (this.config.maxToolCalls !== undefined && this.usedToolCalls >= this.config.maxToolCalls) {
            return {
                exceeded: true,
                reason: `Tool call limit exceeded: ${this.usedToolCalls} / ${this.config.maxToolCalls}`
            }
        }

        if (this.config.maxCostUsd !== undefined && this.usedCostUsd >= this.config.maxCostUsd) {
            return {
                exceeded: true,
                reason: `Cost limit exceeded: $${this.usedCostUsd.toFixed(6)} / $${this.config.maxCostUsd}`
            }
        }

        if (this.config.maxDurationMs !== undefined && elapsedMs >= this.config.maxDurationMs) {
            return {
                exceeded: true,
                reason: `Duration limit exceeded: ${elapsedMs}ms / ${this.config.maxDurationMs}ms`
            }
        }

        return { exceeded: false }
    }

    private calculateCost(usage: Usage): number {
        if (!this.pricing) return 0

        const inputCost = (usage.promptTokens / 1000) * this.pricing.inputPer1K
        const outputCost = (usage.completionTokens / 1000) * this.pricing.outputPer1K

        const cacheWriteCost =
            usage.cacheWriteTokens !== undefined && this.pricing.cacheWritePer1K !== undefined
                ? (usage.cacheWriteTokens / 1000) * this.pricing.cacheWritePer1K
                : 0

        const cacheReadCost =
            usage.cacheReadTokens !== undefined && this.pricing.cacheReadPer1K !== undefined
                ? (usage.cacheReadTokens / 1000) * this.pricing.cacheReadPer1K
                : 0

        const reasoningCost =
            usage.reasoningTokens !== undefined && this.pricing.reasoningPer1K !== undefined
                ? (usage.reasoningTokens / 1000) * this.pricing.reasoningPer1K
                : 0

        return inputCost + outputCost + cacheWriteCost + cacheReadCost + reasoningCost
    }
}
