import vm from 'vm'
import { z } from 'zod'
import { getErrorMessage } from '@core/utils'
import { WorkFlowNodeError } from '../../errors/WorkFlowNodeError'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import { transformNodePortsSchema, transformNodeOutputsSchema, transformNodeConfigSchema } from './validators'

export class TransformNode extends BaseWorkFlowNode<
    typeof transformNodePortsSchema,
    typeof transformNodeOutputsSchema,
    typeof transformNodeConfigSchema
> {
    readonly type = 'transform' as const
    readonly ports = transformNodePortsSchema
    readonly outputs = transformNodeOutputsSchema
    override readonly configSchema = transformNodeConfigSchema

    protected async *run(
        ports: z.infer<typeof transformNodePortsSchema>,
        config: z.infer<typeof transformNodeConfigSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof transformNodeOutputsSchema>>> {
        let result: unknown

        try {
            const context = vm.createContext({ $input: ports.value })
            result = vm.runInContext(config.expression, context, { timeout: 1000 })
        } catch (error) {
            throw new WorkFlowNodeError(
                `Failed to evaluate expression in node "${this.type}": ${getErrorMessage(error)}`
            )
        }

        return { output: { result } }
    }
}
