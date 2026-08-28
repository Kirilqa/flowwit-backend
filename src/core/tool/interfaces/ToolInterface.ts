export interface ToolInterface {
    readonly name: string
    readonly description: string
    readonly parameters: Record<string, unknown>

    execute(
        args: Record<string, unknown>,
        agentId: string,
        sessionId: string,
        workingDirectory?: string
    ): Promise<unknown>
}
