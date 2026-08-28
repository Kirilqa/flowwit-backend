export interface RegistryInterface<TEntity> {
    register(id: string, entity: TEntity): void
    get(id: string): TEntity | null
    has(id: string): boolean
    unregister(id: string): void
    list(): Array<TEntity>
}
