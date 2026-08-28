export function makeSimpleRegistry<T>(items: Record<string, T> = {}) {
    return {
        get: (id: string) => items[id] ?? null,
        has: (id: string) => id in items,
        register: (_id: string, _entity: T) => {},
        unregister: (_id: string) => {},
        list: () => Object.values(items)
    }
}
