import { z } from 'zod'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import { mergeNodePortsSchema, mergeNodeOutputsSchema } from './validators'

export class MergeNode extends BaseWorkFlowNode<typeof mergeNodePortsSchema, typeof mergeNodeOutputsSchema> {
    readonly type = 'merge' as const
    readonly ports = mergeNodePortsSchema
    readonly outputs = mergeNodeOutputsSchema

    protected async *run(
        ports: z.infer<typeof mergeNodePortsSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof mergeNodeOutputsSchema>>> {
        return {
            output: {
                result: {
                    a: ports.a,
                    b: ports.b
                }
            }
        }
    }
}
