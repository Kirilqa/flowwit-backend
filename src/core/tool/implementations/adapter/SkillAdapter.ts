import { Skill } from '@skill'
import { ToolInterface } from '../../interfaces'
import { buildSkillResponse } from '@skill'

export class SkillAdapter implements ToolInterface {
    readonly name: string
    readonly description: string
    readonly parameters: Record<string, unknown>

    constructor(private readonly skill: Skill) {
        this.name = `skill__${skill.name}`
        this.description = skill.description
        this.parameters = {
            type: 'object',
            properties: {},
            required: []
        }
    }

    async execute(_args: Record<string, unknown>): Promise<string> {
        return buildSkillResponse(this.skill)
    }
}
