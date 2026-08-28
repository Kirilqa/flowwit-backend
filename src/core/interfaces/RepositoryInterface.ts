import { ReadableRepositoryInterface } from './ReadableRepositoryInterface'
import { WritableRepositoryInterface } from './WritableRepositoryInterface'

export interface RepositoryInterface<TEntity>
    extends ReadableRepositoryInterface<TEntity>, WritableRepositoryInterface<TEntity> {}
