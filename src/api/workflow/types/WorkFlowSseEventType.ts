export const WORKFLOW_SSE_EVENT_TYPE = {
    RUN_STARTED: 'run_started',
    RUN_COMPLETED: 'run_completed',
    RUN_FAILED: 'run_failed',
    NODE_STARTED: 'node_started',
    NODE_COMPLETED: 'node_completed',
    NODE_FAILED: 'node_failed',
    NODE_EVENT: 'node_event',
    ERROR: 'error'
} as const

export type WorkFlowSseEventType = (typeof WORKFLOW_SSE_EVENT_TYPE)[keyof typeof WORKFLOW_SSE_EVENT_TYPE]
