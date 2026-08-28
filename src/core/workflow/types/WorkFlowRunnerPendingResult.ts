import { WorkFlowEvent } from './WorkFlowEvent'

export type WorkFlowRunnerPendingResult = {
    index: number
    result: IteratorResult<WorkFlowEvent, unknown>
}
