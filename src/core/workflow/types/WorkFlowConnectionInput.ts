import { WorkFlowConnection } from './WorkFlowConnection'

export type WorkFlowConnectionInput = Omit<WorkFlowConnection, 'id'> & { id?: string }
