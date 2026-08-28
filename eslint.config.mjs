import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

export default [
    { ignores: ['dist/**'] },
    js.configs.recommended,
    ...tseslint.configs['flat/strict-type-checked'],
    ...tseslint.configs['flat/stylistic-type-checked'],
    prettierConfig,
    {
        files: ['src/**/*.ts', 'tests/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: ['./tsconfig.json', './tsconfig.test.json'],
                tsconfigRootDir: import.meta.dirname
            },
            globals: { ...globals.node, ...globals.jest }
        },
        plugins: {
            import: importPlugin,
            prettier: prettierPlugin
        },
        rules: {
            'prettier/prettier': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            'import/no-default-export': 'error',
            'no-console': 'warn',
            '@typescript-eslint/array-type': ['error', { default: 'generic' }],
            '@typescript-eslint/consistent-type-definitions': 'off',
            '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true }],
            '@typescript-eslint/require-await': 'off',
            'require-yield': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
            ],
            '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
            '@typescript-eslint/no-empty-function': [
                'error',
                { allow: ['asyncMethods', 'generatorMethods', 'arrowFunctions'] }
            ],
            'no-empty': ['error', { allowEmptyCatch: true }],
            '@typescript-eslint/no-unnecessary-condition': ['error', { allowConstantLoopConditions: true }]
        }
    },
    {
        files: ['tests/**/*.ts'],
        rules: {
            '@typescript-eslint/unbound-method': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/dot-notation': [
                'error',
                { allowPrivateClassPropertyAccess: true, allowProtectedClassPropertyAccess: true }
            ]
        }
    },
    {
        // These files render directly to the terminal as their actual output surface (a chat UI and a
        // trace pretty-printer), not ad-hoc diagnostic logging — console.* here is the correct sink.
        files: [
            'src/core/channel/implementations/console/ConsoleChannel.ts',
            'src/core/channel/implementations/console/ConsoleChannelResponse.ts',
            'src/core/observability/implementations/LogObservability/LogObservability.ts'
        ],
        rules: {
            'no-console': 'off'
        }
    }
]
