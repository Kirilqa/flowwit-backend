import { ScheduledTaskSessionMode } from './ScheduledTaskSessionMode'
import { ScheduledTaskGuardrailPolicy } from './ScheduledTaskGuardrailPolicy'

export const SCHEDULED_TASK_EXECUTION_TYPE = {
    PROMPT: 'prompt',
    WORKFLOW: 'workflow'
} as const

export type ScheduledTaskExecutionType =
    (typeof SCHEDULED_TASK_EXECUTION_TYPE)[keyof typeof SCHEDULED_TASK_EXECUTION_TYPE]

export type ScheduledTaskPromptExecution = {
    type: typeof SCHEDULED_TASK_EXECUTION_TYPE.PROMPT
    agentId: string
    prompt: string
    skills?: Array<string>
    sessionMode: ScheduledTaskSessionMode
    guardrailPolicy?: ScheduledTaskGuardrailPolicy
}

export type ScheduledTaskWorkflowExecution = {
    type: typeof SCHEDULED_TASK_EXECUTION_TYPE.WORKFLOW
    workflowId: string
    input: unknown
}

export type ScheduledTaskExecution = ScheduledTaskPromptExecution | ScheduledTaskWorkflowExecution
