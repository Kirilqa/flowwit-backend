import { z } from 'zod'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import {
    forLoopNodePortsSchema,
    forLoopNodeOutputsSchema,
    forLoopNodeConfigSchema,
    forLoopNodeStateSchema
} from './validators'

export class ForLoopNode extends BaseWorkFlowNode<
    typeof forLoopNodePortsSchema,
    typeof forLoopNodeOutputsSchema,
    typeof forLoopNodeConfigSchema,
    typeof forLoopNodeStateSchema
> {
    readonly type = 'for_loop' as const
    readonly ports = forLoopNodePortsSchema
    readonly outputs = forLoopNodeOutputsSchema
    override readonly configSchema = forLoopNodeConfigSchema
    override readonly stateSchema = forLoopNodeStateSchema

    override isReady(receivedPorts: Set<string>): boolean {
        return receivedPorts.has('value') || receivedPorts.has('loop')
    }

    protected async *run(
        ports: z.infer<typeof forLoopNodePortsSchema>,
        config: z.infer<typeof forLoopNodeConfigSchema>,
        state: z.infer<typeof forLoopNodeStateSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof forLoopNodeOutputsSchema>>> {
        const currentValue = ports.loop ?? ports.value
        const iteration = state.iteration + 1

        if (iteration <= config.iterations) {
            return {
                output: { loop: currentValue },
                state: { iteration },
                executionIds: { loop: true }
            }
        }

        return {
            output: { done: currentValue },
            state: { iteration }
        }
    }
}
