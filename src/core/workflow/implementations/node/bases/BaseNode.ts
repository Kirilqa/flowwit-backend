import { z, ZodObject, ZodRawShape } from 'zod'
import { WorkFlowNodeError } from '../../../errors/WorkFlowNodeError'

export abstract class BaseNode<
    TConfig extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>,
    TState extends ZodObject<ZodRawShape> = ZodObject<ZodRawShape>
> {
    abstract readonly type: string
    abstract readonly isStart: boolean
    abstract readonly outputs: ZodObject<ZodRawShape>
    readonly configSchema: TConfig = z.object({}) as unknown as TConfig
    readonly stateSchema: TState = z.object({}) as unknown as TState

    private _outputsJsonSchema: Record<string, unknown> | null = null
    private _configJsonSchema: Record<string, unknown> | null = null
    private _stateJsonSchema: Record<string, unknown> | null = null

    get outputsJsonSchema(): Record<string, unknown> {
        this._outputsJsonSchema ??= z.toJSONSchema(this.outputs) as Record<string, unknown>
        return this._outputsJsonSchema
    }

    get configJsonSchema(): Record<string, unknown> {
        this._configJsonSchema ??= z.toJSONSchema(this.configSchema) as Record<string, unknown>
        return this._configJsonSchema
    }

    get stateJsonSchema(): Record<string, unknown> {
        this._stateJsonSchema ??= z.toJSONSchema(this.stateSchema) as Record<string, unknown>
        return this._stateJsonSchema
    }

    abstract resolvePortsThroughSchema(ports: Record<string, unknown>): Record<string, unknown>

    resolveConfigThroughSchema(config: Record<string, unknown>): Record<string, unknown> {
        const parsed = this.configSchema.safeParse(config)

        if (!parsed.success) {
            return config
        }

        return parsed.data
    }

    protected validateConfig(config: Record<string, unknown>): z.infer<TConfig> {
        const parsed = this.configSchema.safeParse(config)

        if (!parsed.success) {
            throw new WorkFlowNodeError(
                `Config validation failed for node "${this.type}": ${this.formatIssues(parsed.error.issues, 'config')}`
            )
        }

        return parsed.data
    }

    protected validateState(state: Record<string, unknown>): z.infer<TState> {
        const parsed = this.stateSchema.safeParse(state)

        if (!parsed.success) {
            throw new WorkFlowNodeError(
                `State validation failed for node "${this.type}": ${this.formatIssues(parsed.error.issues, 'state')}`
            )
        }

        return parsed.data
    }

    protected formatIssues(issues: z.ZodError['issues'], fallbackField: string): string {
        return issues
            .map(issue => {
                const field = issue.path.length > 0 ? issue.path.join('.') : fallbackField
                return `${field}: ${issue.message}`
            })
            .join(', ')
    }
}
