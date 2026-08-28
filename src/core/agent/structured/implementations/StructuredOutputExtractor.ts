import Ajv from 'ajv'
import { randomUUID } from 'crypto'
import { CONTENT_TYPE, Message, RESPONSE_FORMAT_TYPE, ProviderInterface } from '@provider'
import { AGENT_EVENT_TYPE, AgentEvent } from '../../types'
import { StructuredOutputExtractorInterface } from '../interfaces'
import { EXTRACTION_PROMPT } from '../prompts/ExtractionPrompt'

export class StructuredOutputExtractor implements StructuredOutputExtractorInterface {
    private readonly ajv = new Ajv()

    async *extract(
        provider: ProviderInterface,
        model: string,
        messages: Array<Message>,
        outputSchema: Record<string, unknown>,
        agentId: string,
        sessionId: string
    ): AsyncIterable<AgentEvent> {
        const extractionMessages: Array<Message> = [
            ...messages,
            {
                role: 'user',
                content: EXTRACTION_PROMPT
            }
        ]

        const stream = provider.generateStream({
            model,
            messages: extractionMessages,
            stream: true,
            responseFormat: {
                type: RESPONSE_FORMAT_TYPE.JSON_SCHEMA,
                name: 'output',
                jsonSchema: outputSchema
            }
        })

        let buffer = ''

        for await (const chunk of stream) {
            if (chunk.state === 'done') continue

            const { content } = chunk.delta
            if (!content) continue

            for (const part of content) {
                if (part.type !== CONTENT_TYPE.TEXT) continue

                buffer += part.text

                yield {
                    id: randomUUID(),
                    type: AGENT_EVENT_TYPE.STRUCTURED_OUTPUT_DELTA,
                    agentId,
                    sessionId,
                    delta: part.text,
                    createdAt: Date.now()
                }
            }
        }

        const parsed = this.parseAndValidate(buffer, outputSchema)

        yield {
            id: randomUUID(),
            type: AGENT_EVENT_TYPE.STRUCTURED_OUTPUT,
            agentId,
            sessionId,
            output: parsed,
            createdAt: Date.now()
        }
    }

    private parseAndValidate(raw: string, outputSchema: Record<string, unknown>): unknown {
        let parsed: unknown

        try {
            parsed = JSON.parse(raw)
        } catch {
            throw new Error(`Structured output is not valid JSON: ${raw}`)
        }

        const validate = this.ajv.compile(outputSchema)
        const valid = validate(parsed)

        if (!valid) {
            const errors = this.ajv.errorsText(validate.errors)
            throw new Error(`Structured output validation failed: ${errors}`)
        }

        return parsed
    }
}
