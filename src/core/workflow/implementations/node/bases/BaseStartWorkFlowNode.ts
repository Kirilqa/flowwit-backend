import { z, ZodObject, ZodRawShape, ZodType } from 'zod'
import { WorkFlowNodeInterface } from '../../../interfaces/WorkFlowNodeInterface'
import { WorkFlowNodeError } from '../../../errors/WorkFlowNodeError'
import { BaseNode } from './BaseNode'
import { WorkFlowNodeResult } from '../../../types/WorkFlowNodeResult'
import { WorkFlowNodeEvent } from '../../../types/WorkFlowNodeEvent'

export abstract class BaseStartWorkFlowNode<
    TInput extends ZodType,
    TOutputs extends ZodObject<ZodRawShape>,
    TConfig extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
    TState extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>
>
    extends BaseNode<TConfig, TState>
    implements WorkFlowNodeInterface
{
    override readonly isStart = true as const
    abstract readonly inputSchema: TInput

    private _portsJsonSchema: Record<string, unknown> | null = null

    get portsJsonSchema(): Record<string, unknown> {
        this._portsJsonSchema ??= {
            $input: z.toJSONSchema(this.inputSchema)
        }

        return this._portsJsonSchema
    }

    get ports(): Record<string, unknown> {
        return {
            $input: this.inputSchema
        }
    }

    isReady(receivedPorts: Set<string>): boolean {
        return receivedPorts.has('$input')
    }

    resolvePortsThroughSchema(ports: Record<string, unknown>): Record<string, unknown> {
        const parsed = this.inputSchema.safeParse(ports['$input'])

        if (!parsed.success) {
            return ports
        }

        return { $input: parsed.data }
    }

    async *execute(
        ports: Record<string, unknown>,
        config: Record<string, unknown>,
        state?: Record<string, unknown>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult> {
        const validatedConfig = this.validateConfig(config)
        const validatedInput = this.validateInput(ports['$input'])
        const validatedState = this.validateState(state ?? {})
        return yield* this.run(validatedInput, validatedConfig, validatedState)
    }

    private validateInput(input: unknown): z.infer<TInput> {
        const parsed = this.inputSchema.safeParse(input)

        if (!parsed.success) {
            throw new WorkFlowNodeError(
                `Input validation failed for node "${this.type}": ${this.formatIssues(parsed.error.issues, '$input')}`
            )
        }

        return parsed.data
    }

    protected abstract run(
        input: z.infer<TInput>,
        config: z.infer<TConfig>,
        state: z.infer<TState>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<TOutputs>>>
}
