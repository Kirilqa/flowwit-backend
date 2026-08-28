import { Skill } from '../types'

export const buildSkillResponse = (skill: Skill): string => {
    const parts: Array<string> = []

    parts.push(`[Skill: ${skill.name}]`)
    parts.push(`Directory: ${skill.directory}`)

    if (skill.compatibility !== undefined) {
        parts.push(`Compatibility: ${skill.compatibility}`)
    }

    parts.push('')
    parts.push('<instructions>')
    parts.push(skill.content)
    parts.push('</instructions>')

    if (skill.resources.length > 0) {
        parts.push('')
        parts.push('<resources>')
        parts.push('The following paths are bundled with this skill, relative to its directory.')
        parts.push(
            'Load a text reference with skill_resource_read. Run anything under scripts/ with skill_resource_run — never with raw filesystem or shell tools. Pass these paths as relativePath, not as absolute paths.'
        )
        parts.push('')

        for (const resource of skill.resources) {
            parts.push(resource)
        }

        parts.push('</resources>')
    }

    return parts.join('\n')
}
