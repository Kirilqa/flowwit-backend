import { z } from 'zod'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import { whileLoopNodePortsSchema, whileLoopNodeOutputsSchema, whileLoopNodeConfigSchema } from './validators'

export class WhileLoopNode extends BaseWorkFlowNode<
    typeof whileLoopNodePortsSchema,
    typeof whileLoopNodeOutputsSchema,
    typeof whileLoopNodeConfigSchema
> {
    readonly type = 'while_loop' as const
    readonly ports = whileLoopNodePortsSchema
    readonly outputs = whileLoopNodeOutputsSchema
    override readonly configSchema = whileLoopNodeConfigSchema

    override isReady(receivedPorts: Set<string>): boolean {
        return receivedPorts.has('value') || receivedPorts.has('loop')
    }

    protected async *run(
        ports: z.infer<typeof whileLoopNodePortsSchema>,
        config: z.infer<typeof whileLoopNodeConfigSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof whileLoopNodeOutputsSchema>>> {
        const currentValue = ports.loop ?? ports.value

        if (config.condition) {
            return {
                output: { loop: currentValue },
                executionIds: { loop: true }
            }
        }

        return {
            output: { done: currentValue }
        }
    }
}
