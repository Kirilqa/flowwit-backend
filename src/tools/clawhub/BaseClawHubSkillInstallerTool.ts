import { ZodObject, ZodRawShape } from 'zod'
import { extname } from 'path'
import AdmZip from 'adm-zip'
import { AgentToolError } from '@tool'
import { getErrorMessage } from '@core/utils'
import {
    ParsedSkillMarkdown,
    parseSkillMarkdown,
    SkillRepositoryInterface,
    SkillRegistryInterface,
    SkillSafetyInspectorInterface,
    SKILL_SAFETY_ACTION,
    SkillScanResult
} from '@skill'
import { BaseClawHubTool } from './BaseClawHubTool'
import { ClawHubClient } from './ClawHubClient'
import { ClawHubScan } from './types'

const SKILL_FILE_NAME = 'SKILL.md'
const SCRIPTS_PREFIX = 'scripts/'

export type SkillArchive = {
    files: Record<string, Buffer>
    inspectableFiles: Record<string, string>
    skillName: string
    skill: ParsedSkillMarkdown
}

export abstract class BaseClawHubSkillInstallerTool<
    TSchema extends ZodObject<ZodRawShape>
> extends BaseClawHubTool<TSchema> {
    constructor(
        client: ClawHubClient,
        protected readonly skillRepository: SkillRepositoryInterface,
        protected readonly skillRegistry: SkillRegistryInterface,
        protected readonly safetyInspector: SkillSafetyInspectorInterface
    ) {
        super(client)
    }

    protected async checkModeration(slug: string): Promise<void> {
        const skillInfo = await this.client.getSkill(slug)

        if (skillInfo.moderation?.isMalwareBlocked === true) {
            throw new AgentToolError(`Skill "${slug}" is blocked by ClawHub moderation: malware detected.`)
        }
    }

    protected async downloadAndExtract(slug: string, version?: string): Promise<SkillArchive> {
        const zipBuffer = await this.client.download(slug, version)
        const zip = new AdmZip(zipBuffer)

        const files = this.readAllFiles(zip)
        const inspectableFiles = this.buildInspectableFiles(files)

        const skillMd = inspectableFiles[SKILL_FILE_NAME]

        if (skillMd === undefined) {
            throw new AgentToolError(`Archive does not contain a ${SKILL_FILE_NAME} file.`)
        }

        let skill: ParsedSkillMarkdown

        try {
            skill = parseSkillMarkdown(skillMd)
        } catch (error) {
            throw new AgentToolError(getErrorMessage(error))
        }

        return { files, inspectableFiles, skillName: skill.name, skill }
    }

    protected async runSafetyInspection(
        slug: string,
        version: string | undefined,
        inspectableFiles: Record<string, string>
    ): Promise<void> {
        const scan = await this.client.getSkillScan(slug, version)

        const inspectionResult = await this.safetyInspector.inspect({
            slug,
            scan: this.mapScan(scan),
            files: inspectableFiles
        })

        if (inspectionResult.action === SKILL_SAFETY_ACTION.BLOCK) {
            throw new AgentToolError(`Skill "${slug}" blocked by safety inspector: ${inspectionResult.reason}`)
        }
    }

    protected async writeResources(skillName: string, files: Record<string, Buffer>): Promise<void> {
        for (const [relativePath, content] of Object.entries(files)) {
            if (relativePath === SKILL_FILE_NAME) continue
            await this.skillRepository.writeResource(skillName, relativePath, content)
        }
    }

    private readAllFiles(zip: AdmZip): Record<string, Buffer> {
        const files: Record<string, Buffer> = {}

        for (const entry of zip.getEntries()) {
            if (entry.isDirectory) continue

            const parts = entry.entryName.replace(/\\/g, '/').split('/')
            const relativePath = parts.slice(1).join('/')

            if (!relativePath) continue

            files[relativePath] = entry.getData()
        }

        return files
    }

    private buildInspectableFiles(files: Record<string, Buffer>): Record<string, string> {
        const inspectableFiles: Record<string, string> = {}

        for (const [relativePath, content] of Object.entries(files)) {
            const isMarkdown = extname(relativePath).toLowerCase() === '.md'
            const isScript = relativePath.startsWith(SCRIPTS_PREFIX)

            if (!isMarkdown && !isScript) continue

            inspectableFiles[relativePath] = content.toString('utf-8')
        }

        return inspectableFiles
    }

    private mapScan(scan: ClawHubScan): SkillScanResult {
        return {
            hasScanResult: scan.hasScanResult,
            verdict: scan.verdict,
            capabilityTags: scan.capabilityTags,
            evidence: scan.evidence.map(e => ({
                code: e.code,
                severity: e.severity,
                file: e.file,
                line: e.line,
                message: e.message
            }))
        }
    }
}
