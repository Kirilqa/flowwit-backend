export function splitCommandArgument(argument: string): { id: string; rest: string } {
    const trimmed = argument.trim()
    const spaceIndex = trimmed.search(/\s/)

    if (spaceIndex === -1) {
        return { id: trimmed, rest: '' }
    }

    return { id: trimmed.slice(0, spaceIndex), rest: trimmed.slice(spaceIndex + 1).trim() }
}
