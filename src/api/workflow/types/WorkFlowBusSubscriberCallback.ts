import { WorkFlowEvent } from '@workflow'

export type WorkFlowBusSubscriberCallback = (event: WorkFlowEvent) => void
