import { SkillSafetyInspectionContext } from '../types/SkillSafetyInspectionContext'
import { SkillSafetyInspectionResult } from '../types/SkillSafetyInspectionResult'

export interface SkillSafetyInspectorInterface {
    inspect(context: SkillSafetyInspectionContext): Promise<SkillSafetyInspectionResult>
}
