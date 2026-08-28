const TOOL_ARGS_MAX_LENGTH = 100

export function formatToolArgs(args: Record<string, unknown>): string {
    const entries = Object.entries(args)
    if (entries.length === 0) return ''

    const text = entries
        .map(([key, value]) => {
            const valueStr = typeof value === 'string' ? value : JSON.stringify(value)
            return `${key}: ${valueStr}`
        })
        .join(', ')

    return text.length > TOOL_ARGS_MAX_LENGTH ? `${text.slice(0, TOOL_ARGS_MAX_LENGTH - 3)}...` : text
}
