import { z } from 'zod'
import { getErrorMessage } from '@core/utils'
import { WorkFlowNodeError } from '../../errors/WorkFlowNodeError'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import { jsonParseNodePortsSchema, jsonParseNodeOutputsSchema } from './validators'

export class JsonParseNode extends BaseWorkFlowNode<
    typeof jsonParseNodePortsSchema,
    typeof jsonParseNodeOutputsSchema
> {
    readonly type = 'json_parse' as const
    readonly ports = jsonParseNodePortsSchema
    readonly outputs = jsonParseNodeOutputsSchema

    protected async *run(
        ports: z.infer<typeof jsonParseNodePortsSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof jsonParseNodeOutputsSchema>>> {
        let result: unknown

        try {
            result = JSON.parse(ports.value)
        } catch (error) {
            throw new WorkFlowNodeError(`Failed to parse JSON in node "${this.type}": ${getErrorMessage(error)}`)
        }

        return { output: { result } }
    }
}
