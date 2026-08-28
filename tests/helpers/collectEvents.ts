export async function collectEvents<T>(iterable: AsyncIterable<T>): Promise<Array<T>> {
    const events: Array<T> = []
    for await (const event of iterable) {
        events.push(event)
    }
    return events
}
