export interface InitializableInterface<TSeed = undefined> {
    ensureInitialized(...args: TSeed extends undefined ? [] : [seed: TSeed]): Promise<void>
}
