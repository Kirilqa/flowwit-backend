export interface SkillResourceRepositoryInterface {
    writeResource(skillName: string, relativePath: string, content: Buffer): Promise<void>
    readResource(skillName: string, relativePath: string): Promise<Buffer>
    deleteResource(skillName: string, relativePath: string): Promise<void>
    resolveExecutablePath(skillName: string, relativePath: string): Promise<string>
}
