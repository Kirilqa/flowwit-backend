import { z } from 'zod'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseStartWorkFlowNode } from './bases/BaseStartWorkFlowNode'
import { inputNodeInputSchema, inputNodeOutputsSchema } from './validators'

export class InputNode extends BaseStartWorkFlowNode<typeof inputNodeInputSchema, typeof inputNodeOutputsSchema> {
    readonly type = 'input' as const
    readonly inputSchema = inputNodeInputSchema
    readonly outputs = inputNodeOutputsSchema

    protected async *run(
        input: z.infer<typeof inputNodeInputSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof inputNodeOutputsSchema>>> {
        return { output: { result: input } }
    }
}
