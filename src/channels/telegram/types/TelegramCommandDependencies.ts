import { Context } from 'grammy'
import { AgentRegistryInterface } from '@agent'
import { SessionManagerInterface } from '@session'
import { TelegramChatState } from './TelegramChatState'
import { TelegramChatStateRepositoryInterface } from '../interfaces/repositories'

export type TelegramCommandDependencies = {
    agentRegistry: AgentRegistryInterface
    sessionManager: SessionManagerInterface
    stateRepository: TelegramChatStateRepositoryInterface
    renderSessionsList: (ctx: Context, state: TelegramChatState, page: number) => Promise<void>
    renderAgentsList: (ctx: Context, state: TelegramChatState, page: number) => Promise<void>
}
