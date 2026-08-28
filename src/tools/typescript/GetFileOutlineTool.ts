import {
    ArrowFunction,
    ClassDeclaration,
    ConstructorDeclaration,
    EnumDeclaration,
    FunctionDeclaration,
    InterfaceDeclaration,
    MethodDeclaration,
    Node,
    TypeAliasDeclaration,
    VariableStatement
} from 'ts-morph'
import { z } from 'zod'
import { BaseTypeScriptTool } from './BaseTypeScriptTool'
import { OUTLINE_SYMBOL_KIND, OutlineSymbol } from './types'
import { getFileOutlineToolSchema } from './validators'

export class GetFileOutlineTool extends BaseTypeScriptTool<typeof getFileOutlineToolSchema> {
    readonly name = 'typescript_get_file_outline'
    readonly description =
        'Returns the structure of a TypeScript/JavaScript file: functions, classes, methods, interfaces, types, enums — with signatures and line numbers. Use this before reading a specific symbol.'
    readonly schema = getFileOutlineToolSchema

    protected async run(args: z.infer<typeof getFileOutlineToolSchema>): Promise<string> {
        const sourceFile = this.getSourceFile(args.path)
        const symbols: Array<OutlineSymbol> = []

        for (const declaration of sourceFile.getFunctions()) {
            symbols.push(this.extractFunction(declaration))
        }

        for (const declaration of sourceFile.getVariableStatements()) {
            symbols.push(...this.extractVariableStatements(declaration))
        }

        for (const declaration of sourceFile.getClasses()) {
            symbols.push(...this.extractClass(declaration))
        }

        for (const declaration of sourceFile.getInterfaces()) {
            symbols.push(this.extractInterface(declaration))
        }

        for (const declaration of sourceFile.getTypeAliases()) {
            symbols.push(this.extractTypeAlias(declaration))
        }

        for (const declaration of sourceFile.getEnums()) {
            symbols.push(this.extractEnum(declaration))
        }

        if (symbols.length === 0) {
            return 'No symbols found in file'
        }

        symbols.sort((a, b) => a.startLine - b.startLine)

        return symbols.map(s => `[${s.kind}] ${s.signature} (lines ${s.startLine}–${s.endLine})`).join('\n')
    }

    private extractFunction(declaration: FunctionDeclaration): OutlineSymbol {
        const name = declaration.getName() ?? '(anonymous)'
        const params = declaration
            .getParameters()
            .map(p => p.getText())
            .join(', ')
        const returnType = declaration.getReturnTypeNode()?.getText() ?? ''
        const signature = `${name}(${params})${returnType ? `: ${returnType}` : ''}`

        return {
            kind: OUTLINE_SYMBOL_KIND.FUNCTION,
            name,
            signature,
            startLine: declaration.getStartLineNumber(),
            endLine: declaration.getEndLineNumber()
        }
    }

    private extractVariableStatements(statement: VariableStatement): Array<OutlineSymbol> {
        const symbols: Array<OutlineSymbol> = []

        for (const declaration of statement.getDeclarations()) {
            const name = declaration.getName()
            const initializer = declaration.getInitializer()

            if (!initializer || !Node.isArrowFunction(initializer)) {
                const typeNode = declaration.getTypeNode()
                symbols.push({
                    kind: OUTLINE_SYMBOL_KIND.VARIABLE,
                    name,
                    signature: typeNode ? `${name}: ${typeNode.getText()}` : name,
                    startLine: statement.getStartLineNumber(),
                    endLine: statement.getEndLineNumber()
                })
                continue
            }

            symbols.push(this.extractArrowFunction(name, initializer, statement))
        }

        return symbols
    }

    private extractArrowFunction(name: string, arrow: ArrowFunction, statement: VariableStatement): OutlineSymbol {
        const params = arrow
            .getParameters()
            .map(p => p.getText())
            .join(', ')
        const returnType = arrow.getReturnTypeNode()?.getText() ?? ''
        const signature = `${name}(${params})${returnType ? `: ${returnType}` : ''}`

        return {
            kind: OUTLINE_SYMBOL_KIND.ARROW_FUNCTION,
            name,
            signature,
            startLine: statement.getStartLineNumber(),
            endLine: statement.getEndLineNumber()
        }
    }

    private extractClass(declaration: ClassDeclaration): Array<OutlineSymbol> {
        const symbols: Array<OutlineSymbol> = []
        const className = declaration.getName() ?? '(anonymous)'
        const extendsClause = declaration.getExtends()?.getText() ?? ''
        const implementsClauses = declaration
            .getImplements()
            .map(i => i.getText())
            .join(', ')

        let classSignature = `class ${className}`
        if (extendsClause) classSignature += ` extends ${extendsClause}`
        if (implementsClauses) classSignature += ` implements ${implementsClauses}`

        symbols.push({
            kind: OUTLINE_SYMBOL_KIND.CLASS,
            name: className,
            signature: classSignature,
            startLine: declaration.getStartLineNumber(),
            endLine: declaration.getEndLineNumber()
        })

        const constructor = declaration.getConstructors()[0]
        if (constructor) {
            symbols.push(this.extractConstructor(className, constructor))
        }

        for (const method of declaration.getMethods()) {
            symbols.push(this.extractMethod(className, method))
        }

        return symbols
    }

    private extractConstructor(className: string, declaration: ConstructorDeclaration): OutlineSymbol {
        const params = declaration
            .getParameters()
            .map(p => p.getText())
            .join(', ')

        return {
            kind: OUTLINE_SYMBOL_KIND.CONSTRUCTOR,
            name: `${className}.constructor`,
            signature: `constructor(${params})`,
            startLine: declaration.getStartLineNumber(),
            endLine: declaration.getEndLineNumber()
        }
    }

    private extractMethod(className: string, declaration: MethodDeclaration): OutlineSymbol {
        const methodName = declaration.getName()
        const params = declaration
            .getParameters()
            .map(p => p.getText())
            .join(', ')
        const returnType = declaration.getReturnTypeNode()?.getText() ?? ''
        const modifiers = declaration
            .getModifiers()
            .map(m => m.getText())
            .join(' ')
        const prefix = modifiers ? `${modifiers} ` : ''
        const signature = `${prefix}${methodName}(${params})${returnType ? `: ${returnType}` : ''}`

        return {
            kind: OUTLINE_SYMBOL_KIND.METHOD,
            name: `${className}.${methodName}`,
            signature,
            startLine: declaration.getStartLineNumber(),
            endLine: declaration.getEndLineNumber()
        }
    }

    private extractInterface(declaration: InterfaceDeclaration): OutlineSymbol {
        const name = declaration.getName()
        const extended = declaration
            .getExtends()
            .map(e => e.getText())
            .join(', ')
        const signature = extended ? `interface ${name} extends ${extended}` : `interface ${name}`

        return {
            kind: OUTLINE_SYMBOL_KIND.INTERFACE,
            name,
            signature,
            startLine: declaration.getStartLineNumber(),
            endLine: declaration.getEndLineNumber()
        }
    }

    private extractTypeAlias(declaration: TypeAliasDeclaration): OutlineSymbol {
        const name = declaration.getName()
        const typeParams = declaration
            .getTypeParameters()
            .map(p => p.getText())
            .join(', ')
        const signature = typeParams ? `type ${name}<${typeParams}>` : `type ${name}`

        return {
            kind: OUTLINE_SYMBOL_KIND.TYPE,
            name,
            signature,
            startLine: declaration.getStartLineNumber(),
            endLine: declaration.getEndLineNumber()
        }
    }

    private extractEnum(declaration: EnumDeclaration): OutlineSymbol {
        const name = declaration.getName()

        return {
            kind: OUTLINE_SYMBOL_KIND.ENUM,
            name,
            signature: `enum ${name}`,
            startLine: declaration.getStartLineNumber(),
            endLine: declaration.getEndLineNumber()
        }
    }
}
