import { CommandSuggestionType } from './CommandSuggestionType'

export type CommandSuggestion = {
    type: CommandSuggestionType
    name: string
    description?: string
}
