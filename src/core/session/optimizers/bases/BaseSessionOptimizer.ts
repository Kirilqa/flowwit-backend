import { ProviderInterface, Usage } from '@provider'
import { AgentMessage } from '@agent/types'
import { SessionOptimizerInterface } from '../interfaces'
import { BaseSessionOptimizerOptions } from '../types'

const DEFAULT_OPTIONS: BaseSessionOptimizerOptions = {
    threshold: 0.7
}

export abstract class BaseSessionOptimizer implements SessionOptimizerInterface {
    private readonly baseOptions: BaseSessionOptimizerOptions

    constructor(options: Partial<BaseSessionOptimizerOptions>) {
        this.baseOptions = { ...DEFAULT_OPTIONS, ...options }
    }

    async optimize(
        messages: Array<AgentMessage>,
        usage: Usage,
        contextWindow: number,
        provider?: ProviderInterface,
        model?: string
    ): Promise<Array<AgentMessage>> {
        const { threshold } = this.baseOptions
        const minimalContextWindow = contextWindow

        const ratio = usage.totalTokens / minimalContextWindow

        if (ratio < threshold) {
            return messages
        }

        return await this.runOptimize(messages, provider, model)
    }

    abstract runOptimize(
        messages: Array<AgentMessage>,
        provider?: ProviderInterface,
        model?: string
    ): Promise<Array<AgentMessage>>
}
