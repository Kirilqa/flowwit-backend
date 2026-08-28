import { parse as parseYaml } from 'yaml'

const FRONTMATTER_DELIMITER = '---'

export type ParsedSkillMarkdown = {
    name: string
    description: string
    content: string
    license?: string
    compatibility?: string
    allowedTools?: Array<string>
    metadata?: Record<string, unknown>
}

export const parseSkillMarkdown = (raw: string): ParsedSkillMarkdown => {
    const { frontmatter, body } = extractFrontmatter(raw)
    const parsed = parseFrontmatter(frontmatter)

    const name = parsed['name']
    const description = parsed['description']

    if (typeof name !== 'string' || !name.trim()) {
        throw new Error('SKILL.md is missing required field: name')
    }

    if (typeof description !== 'string' || !description.trim()) {
        throw new Error('SKILL.md is missing required field: description')
    }

    return {
        name,
        description,
        content: body,
        ...(typeof parsed['license'] === 'string' && { license: parsed['license'] }),
        ...(typeof parsed['compatibility'] === 'string' && { compatibility: parsed['compatibility'] }),
        ...(typeof parsed['allowed-tools'] === 'string' && {
            allowedTools: parsed['allowed-tools'].split(' ').filter(Boolean)
        }),
        ...(parsed['metadata'] !== undefined &&
            parsed['metadata'] !== null &&
            typeof parsed['metadata'] === 'object' &&
            !Array.isArray(parsed['metadata']) && {
                metadata: parsed['metadata'] as Record<string, unknown>
            })
    }
}

const extractFrontmatter = (raw: string): { frontmatter: string; body: string } => {
    const lines = raw.split('\n')

    if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
        return { frontmatter: '', body: raw.trim() }
    }

    const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === FRONTMATTER_DELIMITER)

    if (closingIndex === -1) {
        return { frontmatter: '', body: raw.trim() }
    }

    const frontmatter = lines.slice(1, closingIndex).join('\n')
    const body = lines
        .slice(closingIndex + 1)
        .join('\n')
        .trim()

    return { frontmatter, body }
}

const parseFrontmatter = (frontmatter: string): Record<string, unknown> => {
    if (!frontmatter.trim()) {
        return {}
    }

    try {
        const parsed: unknown = parseYaml(frontmatter)
        return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : {}
    } catch {
        const sanitized = frontmatter.replace(
            /^(\s*\w[\w-]*\s*:\s*)([^'"\n][^\n]*:[^\n]*)$/gm,
            (_, key: string, value: string) => `${key}"${value.replace(/"/g, '\\"')}"`
        )

        try {
            const parsed: unknown = parseYaml(sanitized)
            return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
                ? (parsed as Record<string, unknown>)
                : {}
        } catch {
            return {}
        }
    }
}
