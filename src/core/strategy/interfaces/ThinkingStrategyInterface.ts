import { ToolResult } from '@tool'
import { StrategyDecision, StrategyInput } from '../types'

export interface ThinkingStrategyInterface {
    readonly name: string
    readonly systemPrompt: string

    execute(input: StrategyInput): AsyncGenerator<StrategyDecision, void, ToolResult | undefined>
}
