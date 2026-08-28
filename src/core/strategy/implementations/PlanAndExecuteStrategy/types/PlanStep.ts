import { PlanStepStatus } from './PlanStepStatus'

export type PlanStep = {
    id: string
    description: string
    status: PlanStepStatus
    steps?: Array<PlanStep>
    result?: string
    error?: string
}
