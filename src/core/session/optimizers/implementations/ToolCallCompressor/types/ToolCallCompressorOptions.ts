import { BaseSessionOptimizerOptions } from '../../../types'

export type ToolCallCompressorOptions = BaseSessionOptimizerOptions & {
    argumentsSizeThreshold: number
    resultSizeThreshold: number
    preserveRecentCount: number
}
