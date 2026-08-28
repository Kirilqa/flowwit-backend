import { z } from 'zod'
import { stripUndefined } from '@core/utils'
import {
    SCHEDULED_TASK_EXECUTION_TYPE,
    SCHEDULED_TASK_SESSION_MODE,
    SCHEDULED_TASK_GUARDRAIL_POLICY,
    ScheduledTaskPromptExecution
} from '../types'

export const scheduledTaskExecutionSchema = z.discriminatedUnion('type', [
    z
        .object({
            type: z.literal(SCHEDULED_TASK_EXECUTION_TYPE.PROMPT),
            agentId: z.string().min(1),
            prompt: z.string().min(1),
            skills: z.array(z.string().min(1)).optional(),
            sessionMode: z.enum([SCHEDULED_TASK_SESSION_MODE.EPHEMERAL, SCHEDULED_TASK_SESSION_MODE.PERSISTENT]),
            guardrailPolicy: z
                .enum([SCHEDULED_TASK_GUARDRAIL_POLICY.SAFE_SKIP, SCHEDULED_TASK_GUARDRAIL_POLICY.FAIL])
                .optional()
        })
        .transform(raw => stripUndefined(raw) as ScheduledTaskPromptExecution),
    z.object({
        type: z.literal(SCHEDULED_TASK_EXECUTION_TYPE.WORKFLOW),
        workflowId: z.string().min(1),
        input: z.unknown()
    })
])
