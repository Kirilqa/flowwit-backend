import { createSkillTools } from '@tool/implementations/skill/utils/createSkillTools'
import {
    makeAgentRegistry,
    makeRawAgentConfigRepository,
    makeSkillRegistryMock,
    makeSkillRepository
} from '../../../../../../helpers/makeAgent'

describe('createSkillTools', () => {
    it('returns all twelve skill management tools', () => {
        const tools = createSkillTools(makeSkillRepository(), makeSkillRegistryMock(), makeAgentRegistry())

        expect(tools.map(t => t.name).sort()).toEqual([
            'skill_create',
            'skill_delete',
            'skill_list',
            'skill_read',
            'skill_register',
            'skill_resource_delete',
            'skill_resource_list',
            'skill_resource_read',
            'skill_resource_run',
            'skill_resource_write',
            'skill_unregister',
            'skill_update'
        ])
    })

    it('works without agentConfigRepository', () => {
        const tools = createSkillTools(makeSkillRepository(), makeSkillRegistryMock(), makeAgentRegistry())
        expect(tools).toHaveLength(12)
    })

    it('works with agentConfigRepository', () => {
        const tools = createSkillTools(
            makeSkillRepository(),
            makeSkillRegistryMock(),
            makeAgentRegistry(),
            makeRawAgentConfigRepository()
        )
        expect(tools).toHaveLength(12)
    })
})
