export const COMMAND_SUGGESTION_TYPE = {
    COMMAND: 'command',
    SKILL: 'skill'
} as const

export type CommandSuggestionType = (typeof COMMAND_SUGGESTION_TYPE)[keyof typeof COMMAND_SUGGESTION_TYPE]
