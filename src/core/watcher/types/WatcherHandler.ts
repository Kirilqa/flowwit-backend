import { WatcherEvent } from './WatcherEvent'

export type WatcherHandler = (event: WatcherEvent) => Promise<void>
