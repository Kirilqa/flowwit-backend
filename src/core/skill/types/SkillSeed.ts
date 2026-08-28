import { Skill } from './Skill'

export type SkillSeed = {
    skill: Omit<Skill, 'directory' | 'resources'>
    resources?: Record<string, string>
}
