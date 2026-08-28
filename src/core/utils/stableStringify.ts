export function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value)
    }

    if (Array.isArray(value)) {
        return '[' + value.map(stableStringify).join(',') + ']'
    }

    const obj = value as Record<string, unknown>
    const pairs = Object.keys(obj)
        .sort()
        .filter(key => obj[key] !== undefined)
        .map(key => JSON.stringify(key) + ':' + stableStringify(obj[key]))

    return '{' + pairs.join(',') + '}'
}
