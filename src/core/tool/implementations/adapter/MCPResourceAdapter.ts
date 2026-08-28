import { ToolInterface } from '../../interfaces'
import { MCPClientInterface, MCPResource } from '@mcp'

export class MCPResourceAdapter implements ToolInterface {
    readonly name: string
    readonly description: string
    readonly parameters: Record<string, unknown>

    constructor(
        name: string,
        private readonly client: MCPClientInterface,
        private readonly resource: MCPResource
    ) {
        this.name = name
        this.description = resource.description ?? `Read resource ${resource.uri}`
        this.parameters = {
            type: 'object',
            properties: {},
            required: []
        }
    }

    async execute(_args: Record<string, unknown>): Promise<string> {
        const content = await this.client.readResource(this.resource.uri)

        const output = 'text' in content ? content.text : content.blob

        return output
    }
}
