import { z } from 'zod'
import { PROGRESS_EVALUATION_STATUS } from '../types'

const completedStepWireSchema = z.object({
    stepId: z.string().min(1),
    result: z.string()
})

export const progressEvaluationWireSchema = z.object({
    completedSteps: z.array(completedStepWireSchema),
    status: z
        .enum([
            PROGRESS_EVALUATION_STATUS.FAILED,
            PROGRESS_EVALUATION_STATUS.INCOMPLETE,
            PROGRESS_EVALUATION_STATUS.WAITING_FOR_USER
        ])
        .optional(),
    error: z.string().optional(),
    missingWork: z.string().optional()
})

export const progressEvaluationSchema = progressEvaluationWireSchema.transform(raw => ({
    completedSteps: raw.completedSteps,
    ...(raw.status !== undefined && { status: raw.status }),
    ...(raw.error !== undefined && { error: raw.error }),
    ...(raw.missingWork !== undefined && { missingWork: raw.missingWork })
}))
