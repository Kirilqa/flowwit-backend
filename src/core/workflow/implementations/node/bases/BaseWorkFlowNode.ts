import { z, ZodObject, ZodRawShape } from 'zod'
import { WorkFlowNodeInterface } from '../../../interfaces/WorkFlowNodeInterface'
import { WorkFlowNodeError } from '../../../errors/WorkFlowNodeError'
import { BaseNode } from './BaseNode'
import { WorkFlowNodeResult } from '../../../types/WorkFlowNodeResult'
import { WorkFlowNodeEvent } from '../../../types/WorkFlowNodeEvent'

export abstract class BaseWorkFlowNode<
    TPorts extends ZodObject<ZodRawShape>,
    TOutputs extends ZodObject<ZodRawShape>,
    TConfig extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
    TState extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>
>
    extends BaseNode<TConfig, TState>
    implements WorkFlowNodeInterface
{
    override readonly isStart = false as const
    abstract readonly ports: TPorts

    private _portsJsonSchema: Record<string, unknown> | null = null

    get portsJsonSchema(): Record<string, unknown> {
        this._portsJsonSchema ??= z.toJSONSchema(this.ports, { io: 'input' }) as Record<string, unknown>
        return this._portsJsonSchema
    }

    isReady(receivedPorts: Set<string>): boolean {
        return Object.keys(this.ports.shape).every(port => receivedPorts.has(port))
    }

    resolvePortsThroughSchema(ports: Record<string, unknown>): Record<string, unknown> {
        const parsed = this.ports.safeParse(ports)

        if (!parsed.success) {
            return ports
        }

        return parsed.data
    }

    async *execute(
        ports: Record<string, unknown>,
        config: Record<string, unknown>,
        state?: Record<string, unknown>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult> {
        const validatedPorts = this.validatePorts(ports)
        const validatedConfig = this.validateConfig(config)
        const validatedState = this.validateState(state ?? {})
        return yield* this.run(validatedPorts, validatedConfig, validatedState)
    }

    private validatePorts(ports: Record<string, unknown>): z.infer<TPorts> {
        const parsed = this.ports.safeParse(ports)

        if (!parsed.success) {
            throw new WorkFlowNodeError(
                `Ports validation failed for node "${this.type}": ${this.formatIssues(parsed.error.issues, 'ports')}`
            )
        }

        return parsed.data
    }

    protected abstract run(
        ports: z.infer<TPorts>,
        config: z.infer<TConfig>,
        state: z.infer<TState>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<TOutputs>>>
}
