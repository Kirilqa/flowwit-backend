import { WatcherHandler } from '../types'

export interface FileWatcherInterface {
    watch(pattern: string, handler: WatcherHandler): void
    start(): Promise<void>
    stop(): Promise<void>
}
