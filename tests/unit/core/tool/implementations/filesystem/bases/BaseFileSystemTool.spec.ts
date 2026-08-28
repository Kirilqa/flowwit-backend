import path from 'path'
import { z } from 'zod'
import { BaseFileSystemTool } from '@tool/implementations/filesystem/bases/BaseFileSystemTool'
import { AgentToolError } from '@tool/errors'

const schema = z.object({ path: z.string() })

class TestFileSystemTool extends BaseFileSystemTool<typeof schema> {
    readonly name = 'test_filesystem_tool'
    readonly description = 'test'
    readonly schema = schema

    resolvePathPublic(filePath: string, directory?: string): string {
        return this.resolvePath(filePath, directory)
    }

    get rootDirectoryPublic(): string | null {
        return this.rootDirectory
    }

    protected async run(args: z.infer<typeof schema>): Promise<unknown> {
        return args
    }
}

function makeTool(rootDirectory?: string): TestFileSystemTool {
    return new TestFileSystemTool(rootDirectory)
}

describe('BaseFileSystemTool', () => {
    describe('constructor', () => {
        it('leaves rootDirectory null when not provided', () => {
            expect(makeTool().rootDirectoryPublic).toBeNull()
        })

        it('resolves rootDirectory to an absolute path', () => {
            const tool = makeTool('some/relative/dir')
            expect(tool.rootDirectoryPublic).toBe(path.resolve('some/relative/dir'))
        })
    })

    describe('resolvePath()', () => {
        it('resolves a relative path against process.cwd() when no root or directory is given', () => {
            const tool = makeTool()
            expect(tool.resolvePathPublic('foo.txt')).toBe(path.resolve('foo.txt'))
        })

        it('resolves a relative path against the given directory when no rootDirectory is set', () => {
            const tool = makeTool()
            expect(tool.resolvePathPublic('foo.txt', path.resolve('some', 'dir'))).toBe(
                path.resolve('some', 'dir', 'foo.txt')
            )
        })

        it('resolves a relative path against rootDirectory when set', () => {
            const root = path.resolve('sandbox')
            const tool = makeTool(root)
            expect(tool.resolvePathPublic('foo.txt')).toBe(path.join(root, 'foo.txt'))
        })

        it('lets a passed directory take precedence over rootDirectory', () => {
            const root = path.resolve('sandbox')
            const directory = path.resolve('other', 'dir')
            const tool = makeTool(root)
            expect(tool.resolvePathPublic('foo.txt', directory)).toBe(path.join(directory, 'foo.txt'))
        })

        it('allows a path that resolves exactly to the constrained directory', () => {
            const root = path.resolve('sandbox')
            const tool = makeTool(root)
            expect(tool.resolvePathPublic('.')).toBe(root)
        })

        it('allows a nested path within the constrained directory', () => {
            const root = path.resolve('sandbox')
            const tool = makeTool(root)
            expect(tool.resolvePathPublic(path.join('sub', 'file.txt'))).toBe(path.join(root, 'sub', 'file.txt'))
        })

        it('throws AgentToolError for a path that escapes rootDirectory via traversal', () => {
            const root = path.resolve('sandbox')
            const tool = makeTool(root)
            expect(() => tool.resolvePathPublic(path.join('..', 'escape.txt'))).toThrow(AgentToolError)
        })

        it('throws AgentToolError for a path that escapes a passed directory when no rootDirectory is set', () => {
            const tool = makeTool()
            const directory = path.resolve('sandbox')
            expect(() => tool.resolvePathPublic(path.join('..', 'escape.txt'), directory)).toThrow(AgentToolError)
        })

        it('includes the offending path and the allowed directory in the error message', () => {
            const root = path.resolve('sandbox')
            const tool = makeTool(root)
            let caught: unknown
            try {
                tool.resolvePathPublic(path.join('..', 'escape.txt'))
            } catch (error) {
                caught = error
            }
            expect(caught).toBeInstanceOf(AgentToolError)
            expect(caught).toHaveProperty('message', expect.stringContaining(root))
        })

        it('does not constrain the path when neither rootDirectory nor directory is given', () => {
            const tool = makeTool()
            expect(() => tool.resolvePathPublic(path.join('..', 'anything.txt'))).not.toThrow()
        })
    })
})
