import { Message, StreamChunk } from '@provider'
import { GenerateOptions } from './GenerateOptions'

export type StrategyGenerateFunction = (
    messages: Array<Message>,
    options?: GenerateOptions
) => AsyncIterable<StreamChunk>
