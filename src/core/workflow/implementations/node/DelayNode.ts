import { z } from 'zod'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import { delayNodePortsSchema, delayNodeOutputsSchema, delayNodeConfigSchema } from './validators'

export class DelayNode extends BaseWorkFlowNode<
    typeof delayNodePortsSchema,
    typeof delayNodeOutputsSchema,
    typeof delayNodeConfigSchema
> {
    readonly type = 'delay' as const
    readonly ports = delayNodePortsSchema
    readonly outputs = delayNodeOutputsSchema
    override readonly configSchema = delayNodeConfigSchema

    protected async *run(
        ports: z.infer<typeof delayNodePortsSchema>,
        config: z.infer<typeof delayNodeConfigSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof delayNodeOutputsSchema>>> {
        await new Promise(resolve => setTimeout(resolve, config.delayMs))
        return { output: { result: ports.value } }
    }
}
