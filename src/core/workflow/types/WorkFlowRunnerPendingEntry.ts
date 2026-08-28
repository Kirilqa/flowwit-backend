import { WorkFlowRunNodeEntry } from './WorkFlowRunNodeEntry'

export type WorkFlowRunnerPendingEntry = {
    entry: WorkFlowRunNodeEntry
    executionId: string
}
