import { ProviderInterface, Usage } from '@provider'
import { AgentMessage } from '@agent/types'

export interface SessionOptimizerInterface {
    optimize(
        messages: Array<AgentMessage>,
        usage: Usage,
        contextWindow: number,
        provider?: ProviderInterface,
        model?: string
    ): Promise<Array<AgentMessage>>
}
