import { FileSystemEntryType } from './FileSystemEntryType'

export type FileSystemEntry = {
    name: string
    path: string
    type: FileSystemEntryType
    children?: Array<FileSystemEntry>
}
