import { SkillScanEvidence } from './SkillScanEvidence'

export type SkillScanResult = {
    hasScanResult: boolean
    verdict: string | null
    capabilityTags: Array<string>
    evidence: Array<SkillScanEvidence>
}
