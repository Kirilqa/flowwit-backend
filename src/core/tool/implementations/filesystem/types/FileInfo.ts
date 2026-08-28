import { FileSystemEntryType } from './FileSystemEntryType'

export type FileInfo = {
    path: string
    type: FileSystemEntryType
    size: number
    createdAt: string
    modifiedAt: string
    accessedAt: string
    isReadonly: boolean
}
