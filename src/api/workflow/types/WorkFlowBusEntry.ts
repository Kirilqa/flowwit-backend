import { WorkFlowEvent } from '@workflow'
import { WorkFlowBusSubscriberCallback } from './WorkFlowBusSubscriberCallback'

export type WorkFlowBusEntry = {
    buffer: Array<WorkFlowEvent>
    subscribers: Set<WorkFlowBusSubscriberCallback>
    onCompleteCallbacks: Set<() => void>
    completed: boolean
}
