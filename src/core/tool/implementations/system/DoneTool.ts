import { BaseTool } from '../bases/BaseTool'
import { doneToolSchema } from './validators'

export class DoneTool extends BaseTool<typeof doneToolSchema> {
    readonly name = 'done'
    readonly description = 'Call this tool to explicitly signal that the task is fully completed.'
    readonly schema = doneToolSchema

    protected async run(): Promise<string> {
        return 'done'
    }
}
