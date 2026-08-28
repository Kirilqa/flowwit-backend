import { PLAN_STEP_STATUS, PlanStep, PlanStepDraft } from '../types'

export function hydratePlanDraft(drafts: Array<PlanStepDraft>, startIndex = 0, parentId?: string): Array<PlanStep> {
    return drafts.map((draft, index) => {
        const position = startIndex + index + 1
        const id = parentId !== undefined ? `${parentId}.${position}` : `${position}`
        const steps =
            draft.steps !== undefined && draft.steps.length > 0 ? hydratePlanDraft(draft.steps, 0, id) : undefined

        return {
            id,
            description: draft.description,
            status: PLAN_STEP_STATUS.PENDING,
            ...(steps !== undefined && { steps })
        }
    })
}
