import { WorkFlowNodeEvent } from '../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../types/WorkFlowNodeResult'

export interface WorkFlowNodeInterface {
    readonly type: string
    readonly isStart: boolean
    readonly portsJsonSchema: Record<string, unknown>
    readonly outputsJsonSchema: Record<string, unknown>
    readonly configJsonSchema: Record<string, unknown>
    readonly stateJsonSchema: Record<string, unknown>
    isReady(receivedPorts: Set<string>): boolean
    resolvePortsThroughSchema(ports: Record<string, unknown>): Record<string, unknown>
    resolveConfigThroughSchema(config: Record<string, unknown>): Record<string, unknown>
    execute(
        ports: Record<string, unknown>,
        config: Record<string, unknown>,
        state?: Record<string, unknown>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult>
}
