export async function* toAsyncIterable<T>(items: Array<T>): AsyncIterable<T> {
    for (const item of items) {
        yield item
    }
}
