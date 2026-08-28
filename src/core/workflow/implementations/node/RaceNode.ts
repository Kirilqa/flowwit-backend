import { z } from 'zod'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import { raceNodePortsSchema, raceNodeOutputsSchema } from './validators'

export class RaceNode extends BaseWorkFlowNode<typeof raceNodePortsSchema, typeof raceNodeOutputsSchema> {
    readonly type = 'race' as const
    readonly ports = raceNodePortsSchema
    readonly outputs = raceNodeOutputsSchema

    override isReady(receivedPorts: Set<string>): boolean {
        return receivedPorts.has('a') || receivedPorts.has('b')
    }

    protected async *run(
        ports: z.infer<typeof raceNodePortsSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof raceNodeOutputsSchema>>> {
        return { output: { result: ports.a ?? ports.b } }
    }
}
