export const SKILL_SAFETY_ACTION = {
    ALLOW: 'allow',
    BLOCK: 'block'
} as const

export type SkillSafetyAction = (typeof SKILL_SAFETY_ACTION)[keyof typeof SKILL_SAFETY_ACTION]
