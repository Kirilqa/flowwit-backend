import { ClawHubScanEvidence } from './ClawHubScanEvidence'

export type ClawHubScan = {
    hasScanResult: boolean
    verdict: string | null
    capabilityTags: Array<string>
    engineVersion: string | null
    updatedAt: number | null
    evidence: Array<ClawHubScanEvidence>
}
