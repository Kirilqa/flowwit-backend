import { createClawHubTools } from '@/tools/clawhub/utils/createClawHubTools'
import { NoopSkillSafetyInspector } from '@skill'
import { makeSkillRegistryMock, makeSkillRepository } from '../../../helpers/makeAgent'

describe('createClawHubTools', () => {
    it('returns all five ClawHub tools', () => {
        const tools = createClawHubTools(makeSkillRepository(), makeSkillRegistryMock(), new NoopSkillSafetyInspector())

        expect(tools.map(t => t.name).sort()).toEqual([
            'clawhub_install',
            'clawhub_search',
            'clawhub_skill_info',
            'clawhub_skill_versions',
            'clawhub_update'
        ])
    })
})
