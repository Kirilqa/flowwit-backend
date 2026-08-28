import { WatcherEvent } from '../types'

export interface WatcherEventUpdaterInterface {
    handle(event: WatcherEvent): Promise<void>
}
