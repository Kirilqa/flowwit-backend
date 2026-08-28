import { z } from 'zod'
import { extname } from 'path'
import { SkillRegistryInterface, SkillResourceRepositoryInterface } from '@skill'
import { AgentToolError } from '../../errors'
import { getErrorMessage } from '@core/utils'
import { ShellResult, spawnProcess } from '../shell'
import { BaseSkillTool } from './bases/BaseSkillTool'
import { runSkillResourceToolSchema } from './validators'

const SCRIPTS_PREFIX = 'scripts/'
const DEFAULT_TIMEOUT_MS = 120_000

const INTERPRETERS: Record<string, string> = {
    '.py': 'python3',
    '.js': 'node',
    '.sh': 'sh'
}

export class RunSkillResourceTool extends BaseSkillTool<typeof runSkillResourceToolSchema> {
    readonly name = 'skill_resource_run'
    readonly description =
        'Executes a script bundled with a skill (must be located under scripts/) and returns its stdout, stderr and exit code. Use this to run bundled automation — not to read source code, use skill_resource_read for reference files instead.'
    readonly schema = runSkillResourceToolSchema

    constructor(
        private readonly skillRegistry: SkillRegistryInterface,
        private readonly skillResourceRepository: SkillResourceRepositoryInterface
    ) {
        super()
    }

    protected async run(args: z.infer<typeof runSkillResourceToolSchema>): Promise<ShellResult> {
        const skill = this.skillRegistry.get(args.skillName)

        if (skill === null) {
            throw new AgentToolError(
                `Skill "${args.skillName}" not found in registry. Make sure it is installed and loaded.`
            )
        }

        const normalizedPath = args.relativePath.replace(/\\/g, '/')

        if (!normalizedPath.startsWith(SCRIPTS_PREFIX)) {
            throw new AgentToolError(
                `Resource "${args.relativePath}" is not under ${SCRIPTS_PREFIX}. Only files under ${SCRIPTS_PREFIX} can be executed via skill_resource_run — use skill_resource_read for reference files instead.`
            )
        }

        const extension = extname(normalizedPath).toLowerCase()
        const interpreter = INTERPRETERS[extension]

        if (interpreter === undefined) {
            throw new AgentToolError(
                `File extension "${extension}" is not supported for execution. Supported: ${Object.keys(INTERPRETERS).join(', ')}.`
            )
        }

        let absolutePath: string

        try {
            absolutePath = await this.skillResourceRepository.resolveExecutablePath(args.skillName, args.relativePath)
        } catch (error) {
            throw new AgentToolError(getErrorMessage(error))
        }

        const result = await spawnProcess(interpreter, [absolutePath, ...(args.args ?? [])], {
            cwd: skill.directory,
            timeoutMs: args.timeoutMs ?? DEFAULT_TIMEOUT_MS
        })

        if (result.exitCode !== 0) {
            throw new AgentToolError(result.stderr || `Script exited with code ${result.exitCode}`)
        }

        return result
    }
}
