import { z, ZodObject, ZodRawShape } from 'zod'
import { AgentToolError } from '../../errors'
import { ToolInterface } from '../../interfaces'

export abstract class BaseTool<TSchema extends ZodObject<ZodRawShape>> implements ToolInterface {
    abstract readonly name: string
    abstract readonly description: string
    abstract readonly schema: TSchema

    private _parameters: Record<string, unknown> | null = null

    get parameters(): Record<string, unknown> {
        this._parameters ??= z.toJSONSchema(this.schema, { io: 'input' }) as Record<string, unknown>
        return this._parameters
    }

    async execute(
        args: Record<string, unknown>,
        agentId: string,
        sessionId: string,
        workingDirectory?: string
    ): Promise<unknown> {
        const parsed = this.schema.safeParse(args)

        if (!parsed.success) {
            const message = parsed.error.issues
                .map(e => {
                    const field = e.path.length > 0 ? e.path.join('.') : 'input'
                    return `${field}: ${e.message}`
                })
                .join(', ')

            throw new AgentToolError(`Tool "${this.name}" received invalid arguments: ${message}`)
        }

        return this.run(parsed.data, agentId, sessionId, workingDirectory)
    }

    protected abstract run(
        args: z.infer<TSchema>,
        agentId: string,
        sessionId: string,
        workingDirectory?: string
    ): Promise<unknown>
}
