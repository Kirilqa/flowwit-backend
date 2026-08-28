import { SKILL_SAFETY_ACTION, SkillSafetyAction } from './SkillSafetyAction'

export type SkillSafetyInspectionBaseResult = {
    action: SkillSafetyAction
}

export type SkillSafetyInspectionAllowResult = SkillSafetyInspectionBaseResult & {
    action: typeof SKILL_SAFETY_ACTION.ALLOW
}

export type SkillSafetyInspectionBlockResult = SkillSafetyInspectionBaseResult & {
    action: typeof SKILL_SAFETY_ACTION.BLOCK
    reason: string
}

export type SkillSafetyInspectionResult = SkillSafetyInspectionAllowResult | SkillSafetyInspectionBlockResult
