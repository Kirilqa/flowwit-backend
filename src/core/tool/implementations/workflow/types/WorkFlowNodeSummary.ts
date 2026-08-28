export type WorkFlowNodeSummary = {
    type: string
    isStart: boolean
    ports: Record<string, unknown>
    outputs: Record<string, unknown>
    configSchema: Record<string, unknown>
}
