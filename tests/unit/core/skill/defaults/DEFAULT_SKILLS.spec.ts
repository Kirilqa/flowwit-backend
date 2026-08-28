import { DEFAULT_SKILLS } from '@skill/defaults/DEFAULT_SKILLS'

describe('DEFAULT_SKILLS', () => {
    it('contains exactly the five manager skills', () => {
        expect(DEFAULT_SKILLS.map(seed => seed.skill.name).sort()).toEqual([
            'agent-manager',
            'mcp-manager',
            'scheduler-manager',
            'skill-manager',
            'workflow-manager'
        ])
    })

    it('parses a non-empty description and content for every skill', () => {
        for (const seed of DEFAULT_SKILLS) {
            expect(seed.skill.description.length).toBeGreaterThan(0)
            expect(seed.skill.content.length).toBeGreaterThan(0)
        }
    })

    it('bundles NODES.md alongside workflow-manager only', () => {
        const workflowManager = DEFAULT_SKILLS.find(seed => seed.skill.name === 'workflow-manager')
        expect(workflowManager?.resources).toHaveProperty(['NODES.md'])
        expect(workflowManager?.resources?.['NODES.md']?.length).toBeGreaterThan(0)

        const others = DEFAULT_SKILLS.filter(seed => seed.skill.name !== 'workflow-manager')
        for (const seed of others) {
            expect(seed.resources).toBeUndefined()
        }
    })
})
