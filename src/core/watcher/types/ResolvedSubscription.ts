import picomatch from 'picomatch'
import { WatcherSubscription } from './WatcherSubscription'

export type ResolvedSubscription = WatcherSubscription & {
    isMatch: picomatch.Matcher
}
