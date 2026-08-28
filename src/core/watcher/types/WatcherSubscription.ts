import { WatcherHandler } from './WatcherHandler'

export type WatcherSubscription = {
    pattern: string
    handler: WatcherHandler
}
