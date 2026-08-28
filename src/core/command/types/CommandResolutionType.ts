export const COMMAND_RESOLUTION = {
    MATCHED: 'matched',
    UNKNOWN_COMMAND: 'unknown_command',
    NOT_A_COMMAND: 'not_a_command'
} as const

export type CommandResolutionType = (typeof COMMAND_RESOLUTION)[keyof typeof COMMAND_RESOLUTION]
