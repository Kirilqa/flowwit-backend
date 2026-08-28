import { WorkFlowInterface } from '@workflow'
import { WorkFlowSummary } from '../types'

export function buildWorkFlowSummary(workflow: WorkFlowInterface): WorkFlowSummary {
    return {
        id: workflow.id,
        name: workflow.name,
        ...(workflow.description !== undefined && { description: workflow.description }),
        nodeCount: workflow.getEntries().length,
        connectionCount: workflow.getConnections().length
    }
}
