export interface ReadableRepositoryInterface<TEntity> {
    findAll(): Promise<Array<TEntity>>
    findById(id: string): Promise<TEntity | null>
}
