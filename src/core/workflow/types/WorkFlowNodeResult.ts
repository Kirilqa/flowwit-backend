export type WorkFlowNodeResult<TOutput extends Record<string, unknown> = Record<string, unknown>> = {
    output: TOutput
    state?: Record<string, unknown>
    executionIds?: Partial<Record<keyof TOutput, boolean>>
}
