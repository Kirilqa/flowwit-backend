import { Message } from '@provider'
import { StrategyGenerateFunction } from './StrategyGenerateFunction'

export type StrategyInput = {
    messages: Array<Message>
    generate: StrategyGenerateFunction
}
