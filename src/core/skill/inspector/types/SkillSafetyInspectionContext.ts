import { SkillScanResult } from './SkillScanResult'

export type SkillSafetyInspectionContext = {
    slug: string
    scan: SkillScanResult | null
    files: Record<string, string>
}
