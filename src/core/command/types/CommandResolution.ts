import { CommandInterface } from '../interfaces/CommandInterface'
import { COMMAND_RESOLUTION } from './CommandResolutionType'

export type MatchedCommandResolution = {
    type: typeof COMMAND_RESOLUTION.MATCHED
    command: CommandInterface
    argument: string
    rawContent: string
}

export type UnknownCommandResolution = {
    type: typeof COMMAND_RESOLUTION.UNKNOWN_COMMAND
    trigger: string
}

export type NotACommandResolution = {
    type: typeof COMMAND_RESOLUTION.NOT_A_COMMAND
}

export type CommandResolution = MatchedCommandResolution | UnknownCommandResolution | NotACommandResolution
