import { WorkFlowNodeEvent, WorkFlowNodeResult } from '@workflow'

export type NodeExecutionOutput = {
    result: WorkFlowNodeResult
    events: Array<WorkFlowNodeEvent>
}

export async function runNode(
    generator: AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult>
): Promise<NodeExecutionOutput> {
    const events: Array<WorkFlowNodeEvent> = []

    for (;;) {
        const step = await generator.next()
        if (step.done) {
            return { result: step.value, events }
        }
        events.push(step.value)
    }
}
