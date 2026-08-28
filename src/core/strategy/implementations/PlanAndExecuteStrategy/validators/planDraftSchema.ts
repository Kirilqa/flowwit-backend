import { z } from 'zod'
import { PlanStepDraft } from '../types'

type PlanStepDraftWire = {
    description: string
    steps?: Array<PlanStepDraftWire> | undefined
}

const planStepDraftWireSchema: z.ZodType<PlanStepDraftWire> = z.object({
    description: z.string().min(1),
    steps: z.array(z.lazy(() => planStepDraftWireSchema)).optional()
})

export const planDraftWireSchema = z.object({
    steps: z.array(planStepDraftWireSchema).min(1)
})

function cleanPlanStepDraft(wire: PlanStepDraftWire): PlanStepDraft {
    return {
        description: wire.description,
        ...(wire.steps !== undefined && { steps: wire.steps.map(cleanPlanStepDraft) })
    }
}

export const planDraftSchema = planDraftWireSchema.transform(raw => ({
    steps: raw.steps.map(cleanPlanStepDraft)
}))
