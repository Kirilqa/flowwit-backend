import { z } from 'zod'
import { PREPARATION_OUTCOME_STATUS } from '../types'

export const preparationOutcomeSchema = z.object({
    status: z.enum([
        PREPARATION_OUTCOME_STATUS.DIRECT_RESPONSE,
        PREPARATION_OUTCOME_STATUS.WAITING_FOR_USER,
        PREPARATION_OUTCOME_STATUS.PROCEED_TO_PLAN
    ])
})
