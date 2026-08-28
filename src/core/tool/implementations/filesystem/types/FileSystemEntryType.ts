export const FILE_SYSTEM_ENTRY_TYPE = {
    FILE: 'file',
    DIRECTORY: 'directory',
    SYMLINK: 'symlink',
    OTHER: 'other'
} as const

export type FileSystemEntryType = (typeof FILE_SYSTEM_ENTRY_TYPE)[keyof typeof FILE_SYSTEM_ENTRY_TYPE]
