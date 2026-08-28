import { AgentEvent } from '@agent'
import { AgentDispatcherInterface } from '@agent/dispatcher'
import { SessionInterface } from '@session'
import { Skill } from '@skill'
import { SkillAdapter } from '@tool'
import { CommandInterface } from '../../interfaces'

export class SkillCommand implements CommandInterface {
    readonly name: string
    readonly description: string

    constructor(
        private readonly skill: Skill,
        private readonly dispatcher: AgentDispatcherInterface
    ) {
        this.name = skill.name
        this.description = skill.description
    }

    async *execute(
        _argument: string,
        rawContent: string,
        agentId: string,
        session: SessionInterface
    ): AsyncIterable<AgentEvent> {
        yield* this.dispatcher.send(agentId, session, rawContent, {
            forcedToolCalls: [{ tool: new SkillAdapter(this.skill), arguments: {}, bypassGuardrails: true }]
        })
    }
}
