import { z } from 'zod'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import { conditionNodePortsSchema, conditionNodeOutputsSchema, conditionNodeConfigSchema } from './validators'

export class ConditionNode extends BaseWorkFlowNode<
    typeof conditionNodePortsSchema,
    typeof conditionNodeOutputsSchema,
    typeof conditionNodeConfigSchema
> {
    readonly type = 'condition' as const
    readonly ports = conditionNodePortsSchema
    readonly outputs = conditionNodeOutputsSchema
    override readonly configSchema = conditionNodeConfigSchema

    protected async *run(
        ports: z.infer<typeof conditionNodePortsSchema>,
        config: z.infer<typeof conditionNodeConfigSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof conditionNodeOutputsSchema>>> {
        if (config.condition) {
            return { output: { true: ports.value } }
        }

        return { output: { false: ports.value } }
    }
}
