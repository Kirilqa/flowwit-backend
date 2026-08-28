import { RegistryInterface } from '../interfaces'

export abstract class BaseRegistry<TEntity> implements RegistryInterface<TEntity> {
    private readonly store = new Map<string, TEntity>()

    register(name: string, entity: TEntity): void {
        this.store.set(name, entity)
    }

    get(name: string): TEntity | null {
        return this.store.get(name) ?? null
    }

    has(name: string): boolean {
        return this.store.has(name)
    }

    unregister(name: string): void {
        this.store.delete(name)
    }

    list(): Array<TEntity> {
        return Array.from(this.store.values())
    }
}
