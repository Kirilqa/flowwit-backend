export const WATCHER_EVENT_TYPE = {
    ADD: 'add',
    CHANGE: 'change',
    UNLINK: 'unlink'
} as const

export type WatcherEventType = (typeof WATCHER_EVENT_TYPE)[keyof typeof WATCHER_EVENT_TYPE]
