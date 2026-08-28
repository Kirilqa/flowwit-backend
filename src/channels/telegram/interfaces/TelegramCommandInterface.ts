import { Context } from 'grammy'
import { TelegramCommandDependencies } from '../types'

export interface TelegramCommandInterface {
    readonly command: string
    readonly aliases: ReadonlyArray<string>
    handle(ctx: Context, dependencies: TelegramCommandDependencies): Promise<void>
}
