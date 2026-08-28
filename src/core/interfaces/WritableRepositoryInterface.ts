export interface WritableRepositoryInterface<TEntity> {
    create(entity: TEntity): Promise<TEntity>
    update(id: string, patch: Partial<TEntity>): Promise<TEntity>
    delete(id: string): Promise<void>
}
