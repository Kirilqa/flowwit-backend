import { z } from 'zod'
import { getErrorMessage } from '@core/utils'
import { WorkFlowNodeError } from '../../errors/WorkFlowNodeError'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import {
    jsonStringifyNodePortsSchema,
    jsonStringifyNodeOutputsSchema,
    jsonStringifyNodeConfigSchema
} from './validators'

export class JsonStringifyNode extends BaseWorkFlowNode<
    typeof jsonStringifyNodePortsSchema,
    typeof jsonStringifyNodeOutputsSchema,
    typeof jsonStringifyNodeConfigSchema
> {
    readonly type = 'json_stringify' as const
    readonly ports = jsonStringifyNodePortsSchema
    readonly outputs = jsonStringifyNodeOutputsSchema
    override readonly configSchema = jsonStringifyNodeConfigSchema

    protected async *run(
        ports: z.infer<typeof jsonStringifyNodePortsSchema>,
        config: z.infer<typeof jsonStringifyNodeConfigSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof jsonStringifyNodeOutputsSchema>>> {
        let result: string

        try {
            result = JSON.stringify(ports.value, null, config.indent || undefined)
        } catch (error) {
            throw new WorkFlowNodeError(`Failed to stringify value in node "${this.type}": ${getErrorMessage(error)}`)
        }

        return { output: { result } }
    }
}
