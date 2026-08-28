import { CommandResolution } from '../types'

export interface CommandResolverInterface {
    resolve(content: string): CommandResolution
}
