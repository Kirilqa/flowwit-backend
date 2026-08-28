import AdmZip from 'adm-zip'
import { extname } from 'path'
import { FastifyReply, FastifyRequest } from 'fastify'
import {
    ParsedSkillMarkdown,
    parseSkillMarkdown,
    SKILL_SAFETY_ACTION,
    SkillRegistryInterface,
    SkillRepositoryInterface,
    SkillSafetyInspectorInterface
} from '@skill'
import { getErrorMessage } from '@core/utils'
import { skillNameParamsSchema } from '../validators'

const SKILL_FILE_NAME = 'SKILL.md'
const SCRIPTS_PREFIX = 'scripts/'

export class SkillsController {
    constructor(
        private readonly skillRegistry: SkillRegistryInterface,
        private readonly skillRepository: SkillRepositoryInterface,
        private readonly safetyInspector: SkillSafetyInspectorInterface
    ) {}

    async listSkills(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const skills = this.skillRegistry.list().map(skill => ({
            name: skill.name,
            description: skill.description,
            ...(skill.license !== undefined && { license: skill.license }),
            ...(skill.compatibility !== undefined && { compatibility: skill.compatibility })
        }))

        await reply.status(200).send(skills)
    }

    async getSkill(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = skillNameParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const skill = this.skillRegistry.get(params.data.name)

        if (skill === null) {
            await reply.status(404).send({ error: `Skill "${params.data.name}" not found` })
            return
        }

        await reply.status(200).send({
            name: skill.name,
            description: skill.description,
            content: skill.content,
            directory: skill.directory,
            resources: skill.resources,
            ...(skill.license !== undefined && { license: skill.license }),
            ...(skill.compatibility !== undefined && { compatibility: skill.compatibility }),
            ...(skill.allowedTools !== undefined && { allowedTools: skill.allowedTools }),
            ...(skill.metadata !== undefined && { metadata: skill.metadata })
        })
    }

    async deleteSkill(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const params = skillNameParamsSchema.safeParse(request.params)

        if (!params.success) {
            await reply.status(400).send({ error: 'Invalid params' })
            return
        }

        const existing = await this.skillRepository.findById(params.data.name)

        if (existing === null) {
            await reply.status(404).send({ error: `Skill "${params.data.name}" not found` })
            return
        }

        await this.skillRepository.delete(params.data.name)

        if (this.skillRegistry.has(params.data.name)) {
            this.skillRegistry.unregister(params.data.name)
        }

        await reply.status(204).send()
    }

    async inspectSkill(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const buffer = this.extractBuffer(request)

        if (buffer === null) {
            await reply
                .status(400)
                .send({ error: 'Body must be a ZIP file sent as application/zip or application/octet-stream' })
            return
        }

        let inspectableFiles: Record<string, string>
        let skill: ParsedSkillMarkdown

        try {
            const parsed = this.parseZip(buffer)
            inspectableFiles = parsed.inspectableFiles
            skill = parsed.skill
        } catch (error) {
            await reply.status(400).send({ error: getErrorMessage(error) })
            return
        }

        const result = await this.safetyInspector.inspect({ slug: skill.name, scan: null, files: inspectableFiles })

        await reply.status(200).send(result)
    }

    async installSkill(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        const buffer = this.extractBuffer(request)

        if (buffer === null) {
            await reply
                .status(400)
                .send({ error: 'Body must be a ZIP file sent as application/zip or application/octet-stream' })
            return
        }

        let files: Record<string, Buffer>
        let inspectableFiles: Record<string, string>
        let skill: ParsedSkillMarkdown

        try {
            const parsed = this.parseZip(buffer)
            files = parsed.files
            inspectableFiles = parsed.inspectableFiles
            skill = parsed.skill
        } catch (error) {
            await reply.status(400).send({ error: getErrorMessage(error) })
            return
        }

        const inspectionResult = await this.safetyInspector.inspect({
            slug: skill.name,
            scan: null,
            files: inspectableFiles
        })

        if (inspectionResult.action === SKILL_SAFETY_ACTION.BLOCK) {
            await reply.status(422).send({ error: `Skill blocked by safety inspector: ${inspectionResult.reason}` })
            return
        }

        if (this.skillRegistry.has(skill.name)) {
            await reply.status(409).send({ error: `Skill "${skill.name}" is already installed` })
            return
        }

        await this.skillRepository.create({ ...skill, directory: '', resources: [] })

        for (const [relativePath, content] of Object.entries(files)) {
            if (relativePath === SKILL_FILE_NAME) continue
            await this.skillRepository.writeResource(skill.name, relativePath, content)
        }

        const installed = await this.skillRepository.findById(skill.name)

        if (installed === null) {
            await reply
                .status(500)
                .send({ error: `Skill "${skill.name}" was installed but could not be loaded from disk` })
            return
        }

        this.skillRegistry.register(skill.name, installed)

        await reply.status(201).send({ name: installed.name, description: installed.description })
    }

    private extractBuffer(request: FastifyRequest): Buffer | null {
        if (request.body instanceof Buffer) return request.body
        return null
    }

    private parseZip(buffer: Buffer): {
        files: Record<string, Buffer>
        inspectableFiles: Record<string, string>
        skill: ParsedSkillMarkdown
    } {
        const zip = new AdmZip(buffer)
        const files: Record<string, Buffer> = {}

        for (const entry of zip.getEntries()) {
            if (entry.isDirectory) continue

            const parts = entry.entryName.replace(/\\/g, '/').split('/')
            const relativePath = parts.slice(1).join('/')

            if (!relativePath) continue

            files[relativePath] = entry.getData()
        }

        const inspectableFiles: Record<string, string> = {}

        for (const [relativePath, content] of Object.entries(files)) {
            const isMarkdown = extname(relativePath).toLowerCase() === '.md'
            const isScript = relativePath.startsWith(SCRIPTS_PREFIX)

            if (!isMarkdown && !isScript) continue

            inspectableFiles[relativePath] = content.toString('utf-8')
        }

        const skillMd = inspectableFiles[SKILL_FILE_NAME]

        if (skillMd === undefined) {
            throw new Error(`Archive does not contain a ${SKILL_FILE_NAME} file`)
        }

        const skill = parseSkillMarkdown(skillMd)

        return { files, inspectableFiles, skill }
    }
}
