import { z } from 'zod'
import { BaseTypeScriptTool } from './BaseTypeScriptTool'
import { ImportEntry } from './types'
import { getImportsToolSchema } from './validators'

export class GetImportsTool extends BaseTypeScriptTool<typeof getImportsToolSchema> {
    readonly name = 'typescript_get_imports'
    readonly description =
        'Returns all import declarations in a TypeScript/JavaScript file with their sources, named imports, default imports, and type-only flags.'
    readonly schema = getImportsToolSchema

    protected async run(args: z.infer<typeof getImportsToolSchema>): Promise<string> {
        const sourceFile = this.getSourceFile(args.path)
        const imports: Array<ImportEntry> = []

        for (const declaration of sourceFile.getImportDeclarations()) {
            const moduleSpecifier = declaration.getModuleSpecifierValue()
            const defaultImport = declaration.getDefaultImport()?.getText() ?? null
            const namespaceImport = declaration.getNamespaceImport()?.getText() ?? null
            const isTypeOnly = declaration.isTypeOnly()

            const namedImports = declaration.getNamedImports().map(named => ({
                name: named.getName(),
                alias: named.getAliasNode()?.getText() ?? null
            }))

            imports.push({
                moduleSpecifier,
                defaultImport,
                namespaceImport,
                namedImports,
                isTypeOnly
            })
        }

        if (imports.length === 0) {
            return 'No imports found in file'
        }

        const output = imports.map(entry => this.formatImport(entry)).join('\n')

        return output
    }

    private formatImport(entry: ImportEntry): string {
        const parts: Array<string> = []

        if (entry.isTypeOnly) parts.push('type')
        if (entry.defaultImport) parts.push(entry.defaultImport)
        if (entry.namespaceImport) parts.push(`* as ${entry.namespaceImport}`)

        if (entry.namedImports.length > 0) {
            const named = entry.namedImports.map(n => (n.alias ? `${n.name} as ${n.alias}` : n.name)).join(', ')
            parts.push(`{ ${named} }`)
        }

        const specifiers = parts.join(', ')

        return specifiers ? `import ${specifiers} from '${entry.moduleSpecifier}'` : `import '${entry.moduleSpecifier}'`
    }
}
