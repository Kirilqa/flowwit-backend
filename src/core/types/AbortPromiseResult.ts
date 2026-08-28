export type AbortPromiseResult = {
    promise: Promise<never>
    cleanup: () => void
}
