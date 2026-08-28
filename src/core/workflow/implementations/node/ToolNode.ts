import { z } from 'zod'
import { ToolRegistryInterface } from '@tool'
import { WorkFlowNodeError } from '../../errors/WorkFlowNodeError'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import { toolNodePortsSchema, toolNodeOutputsSchema, toolNodeConfigSchema } from './validators'

export class ToolNode extends BaseWorkFlowNode<
    typeof toolNodePortsSchema,
    typeof toolNodeOutputsSchema,
    typeof toolNodeConfigSchema
> {
    readonly type = 'tool' as const
    readonly ports = toolNodePortsSchema
    readonly outputs = toolNodeOutputsSchema
    override readonly configSchema = toolNodeConfigSchema

    constructor(private readonly toolRegistry: ToolRegistryInterface) {
        super()
    }

    protected async *run(
        ports: z.infer<typeof toolNodePortsSchema>,
        config: z.infer<typeof toolNodeConfigSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof toolNodeOutputsSchema>>> {
        const tool = this.toolRegistry.get(config.toolName)

        if (tool === null) {
            throw new WorkFlowNodeError(`Tool "${config.toolName}" not found in registry`)
        }

        const result = await tool.execute(ports.args, this.type, this.type)

        return { output: { result } }
    }
}
