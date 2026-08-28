import { ToolInterface } from '../../interfaces'
import { MCPClientInterface, MCPPrompt } from '@mcp'

export class MCPPromptAdapter implements ToolInterface {
    readonly name: string
    readonly description: string
    readonly parameters: Record<string, unknown>

    constructor(
        name: string,
        private readonly client: MCPClientInterface,
        private readonly prompt: MCPPrompt
    ) {
        this.name = name
        this.description = prompt.description ?? `Execute prompt ${prompt.name}`
        this.parameters = this.buildParameters(prompt)
    }

    async execute(args: Record<string, unknown>): Promise<string> {
        const stringArgs = Object.fromEntries(Object.entries(args).map(([k, v]) => [k, String(v)]))

        const content = await this.client.getPrompt(this.prompt.name, stringArgs)

        return content
    }

    private buildParameters(prompt: MCPPrompt): Record<string, unknown> {
        if (!prompt.arguments?.length) {
            return { type: 'object', properties: {}, required: [] }
        }

        const properties: Record<string, unknown> = {}
        const required: Array<string> = []

        for (const arg of prompt.arguments) {
            properties[arg.name] = {
                type: 'string',
                ...(arg.description && { description: arg.description })
            }

            if (arg.required) {
                required.push(arg.name)
            }
        }

        return { type: 'object', properties, required }
    }
}
