import { STEP_EXECUTION_OUTCOME_STATUS } from './StepExecutionOutcomeStatus'

export type StepExecutionOutcomeCompleted = {
    status: typeof STEP_EXECUTION_OUTCOME_STATUS.COMPLETED
    completedCount: number
}

export type StepExecutionOutcomeFailed = {
    status: typeof STEP_EXECUTION_OUTCOME_STATUS.FAILED
    completedCount: number
    error: string
}

export type StepExecutionOutcomeWaitingForUser = {
    status: typeof STEP_EXECUTION_OUTCOME_STATUS.WAITING_FOR_USER
    completedCount: number
}

export type StepExecutionOutcome =
    StepExecutionOutcomeCompleted | StepExecutionOutcomeFailed | StepExecutionOutcomeWaitingForUser
