export const WORKFLOW_EVENT_TYPE = {
    RUN_STARTED: 'run_started',
    RUN_COMPLETED: 'run_completed',
    RUN_FAILED: 'run_failed',
    NODE_STARTED: 'node_started',
    NODE_COMPLETED: 'node_completed',
    NODE_FAILED: 'node_failed',
    NODE_EVENT: 'node_event'
} as const

export type WorkFlowEventType = (typeof WORKFLOW_EVENT_TYPE)[keyof typeof WORKFLOW_EVENT_TYPE]
