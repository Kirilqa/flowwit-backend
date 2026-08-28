export const WORKFLOW_NODE_STATE_STATUS = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped'
} as const

export type WorkFlowNodeStateStatus = (typeof WORKFLOW_NODE_STATE_STATUS)[keyof typeof WORKFLOW_NODE_STATE_STATUS]
