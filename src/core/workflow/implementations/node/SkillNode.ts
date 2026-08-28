import { SkillRegistryInterface, buildSkillResponse } from '@skill'
import { z } from 'zod'
import { WorkFlowNodeError } from '../../errors/WorkFlowNodeError'
import { WorkFlowNodeEvent } from '../../types/WorkFlowNodeEvent'
import { WorkFlowNodeResult } from '../../types/WorkFlowNodeResult'
import { BaseWorkFlowNode } from './bases/BaseWorkFlowNode'
import { skillNodePortsSchema, skillNodeOutputsSchema, skillNodeConfigSchema } from './validators'

export class SkillNode extends BaseWorkFlowNode<
    typeof skillNodePortsSchema,
    typeof skillNodeOutputsSchema,
    typeof skillNodeConfigSchema
> {
    readonly type = 'skill' as const
    readonly ports = skillNodePortsSchema
    readonly outputs = skillNodeOutputsSchema
    override readonly configSchema = skillNodeConfigSchema

    constructor(private readonly skillRegistry: SkillRegistryInterface) {
        super()
    }

    protected async *run(
        _ports: z.infer<typeof skillNodePortsSchema>,
        config: z.infer<typeof skillNodeConfigSchema>
    ): AsyncGenerator<WorkFlowNodeEvent, WorkFlowNodeResult<z.infer<typeof skillNodeOutputsSchema>>> {
        const skill = this.skillRegistry.get(config.skillName)

        if (skill === null) {
            throw new WorkFlowNodeError(`Skill "${config.skillName}" not found in registry`)
        }

        return { output: { result: buildSkillResponse(skill) } }
    }
}
