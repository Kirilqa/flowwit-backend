import { CONTENT_TYPE, StreamChunk, Usage } from '@provider'
import { AggregatedTextStream } from '../types'

export async function aggregateTextStream(stream: AsyncIterable<StreamChunk>): Promise<AggregatedTextStream> {
    let text = ''
    let usage: Usage | undefined = undefined

    for await (const chunk of stream) {
        if (chunk.state === 'done') {
            if (chunk.usage !== undefined) {
                usage = chunk.usage
            }
            continue
        }

        const { content } = chunk.delta

        if (!content) continue

        for (const part of content) {
            if (part.type === CONTENT_TYPE.TEXT) {
                text += part.text
            }
        }
    }

    return { text, ...(usage !== undefined && { usage }) }
}
