import chokidar, { FSWatcher } from 'chokidar'
import picomatch from 'picomatch'
import { getErrorMessage } from '@core/utils'
import { LoggerInterface } from '@logger'
import { FileWatcherInterface } from '../interfaces'
import { ResolvedSubscription, WATCHER_EVENT_TYPE, WatcherEvent, WatcherHandler } from '../types'

export class FileWatcher implements FileWatcherInterface {
    private readonly subscriptions: Array<ResolvedSubscription> = []
    private watcher: FSWatcher | null = null
    private readonly logger: LoggerInterface

    constructor(logger: LoggerInterface) {
        this.logger = logger.child('FileWatcher')
    }

    watch(pattern: string, handler: WatcherHandler): void {
        const normalizedPattern = pattern.replace(/\\/g, '/')
        this.subscriptions.push({
            pattern,
            handler,
            isMatch: picomatch(normalizedPattern, { dot: true })
        })
    }

    async start(): Promise<void> {
        if (this.watcher !== null) {
            return
        }

        const watchPaths = [
            ...new Set(
                this.subscriptions.map(subscription => {
                    const normalized = subscription.pattern.replace(/\\/g, '/').replace(/^\.\//, '')
                    const parts = normalized.split('/')
                    const base: Array<string> = []
                    for (const part of parts) {
                        if (part.includes('*') || part.includes('?') || part.includes('{') || part.includes('[')) break
                        base.push(part)
                    }
                    return base.join('/') || '.'
                })
            )
        ]

        const watcher = chokidar.watch(watchPaths, {
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 300,
                pollInterval: 50
            }
        })

        this.watcher = watcher

        watcher.on(WATCHER_EVENT_TYPE.ADD, path => {
            this.handleEvent({ type: WATCHER_EVENT_TYPE.ADD, path })
        })

        watcher.on(WATCHER_EVENT_TYPE.CHANGE, path => {
            this.handleEvent({ type: WATCHER_EVENT_TYPE.CHANGE, path })
        })

        watcher.on(WATCHER_EVENT_TYPE.UNLINK, path => {
            this.handleEvent({ type: WATCHER_EVENT_TYPE.UNLINK, path })
        })

        await new Promise<void>(resolve => {
            watcher.on('ready', resolve)
        })
    }

    async stop(): Promise<void> {
        if (this.watcher === null) {
            return
        }

        await this.watcher.close()
        this.watcher = null
    }

    private handleEvent(event: WatcherEvent): void {
        const normalizedPath = event.path.replace(/\\/g, '/')

        for (const subscription of this.subscriptions) {
            if (subscription.isMatch(normalizedPath)) {
                subscription.handler({ ...event, path: normalizedPath }).catch((error: unknown) => {
                    this.logger.error(`Handler error for pattern "${subscription.pattern}"`, {
                        pattern: subscription.pattern,
                        path: normalizedPath,
                        error: getErrorMessage(error)
                    })
                })
            }
        }
    }
}
