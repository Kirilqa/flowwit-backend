import { SkillSafetyInspectorInterface } from '../interfaces'
import { SKILL_SAFETY_ACTION, SkillSafetyInspectionContext, SkillSafetyInspectionResult } from '../types'

export class NoopSkillSafetyInspector implements SkillSafetyInspectorInterface {
    async inspect(_context: SkillSafetyInspectionContext): Promise<SkillSafetyInspectionResult> {
        return { action: SKILL_SAFETY_ACTION.ALLOW }
    }
}
