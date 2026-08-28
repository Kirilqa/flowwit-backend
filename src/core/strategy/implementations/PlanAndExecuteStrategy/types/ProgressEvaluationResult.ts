import { ProgressEvaluationCompletedStep } from './ProgressEvaluationCompletedStep'
import { ProgressEvaluationStatus } from './ProgressEvaluationStatus'

export type ProgressEvaluationResult = {
    completedSteps: Array<ProgressEvaluationCompletedStep>
    status?: ProgressEvaluationStatus
    error?: string
    missingWork?: string
}
