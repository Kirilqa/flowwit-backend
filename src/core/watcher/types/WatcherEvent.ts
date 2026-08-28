import { WATCHER_EVENT_TYPE } from './WatcherEventType'

export type WatcherEventBase = {
    path: string
}

export type AddWatcherEvent = WatcherEventBase & {
    type: typeof WATCHER_EVENT_TYPE.ADD
}

export type ChangeWatcherEvent = WatcherEventBase & {
    type: typeof WATCHER_EVENT_TYPE.CHANGE
}

export type UnlinkWatcherEvent = WatcherEventBase & {
    type: typeof WATCHER_EVENT_TYPE.UNLINK
}

export type WatcherEvent = AddWatcherEvent | ChangeWatcherEvent | UnlinkWatcherEvent
