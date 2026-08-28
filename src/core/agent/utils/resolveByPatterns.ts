import picomatch from 'picomatch'

export const resolveByPatterns = <TEntity>(
    patterns: Array<string>,
    entities: Array<TEntity>,
    getId: (entity: TEntity) => string,
    entityType: string,
    agentName: string,
    onUnmatchedPattern: (entityType: string, pattern: string, agentName: string) => void
): Array<TEntity> => {
    const allIds = entities.map(getId)
    const matched = new Set<string>()

    for (const pattern of patterns) {
        const isMatch = picomatch(pattern)
        const matchedIds = allIds.filter(id => isMatch(id))

        if (matchedIds.length === 0) {
            onUnmatchedPattern(entityType, pattern, agentName)
            continue
        }

        for (const id of matchedIds) {
            matched.add(id)
        }
    }

    return entities.filter(entity => matched.has(getId(entity)))
}
