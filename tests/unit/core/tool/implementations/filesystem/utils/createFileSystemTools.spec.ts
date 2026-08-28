import { createFileSystemTools } from '@tool/implementations/filesystem/utils/createFileSystemTools'

describe('createFileSystemTools', () => {
    it('returns all twelve filesystem tools', () => {
        const tools = createFileSystemTools()

        expect(tools.map(t => t.name).sort()).toEqual([
            'filesystem_copy',
            'filesystem_create_directory',
            'filesystem_delete',
            'filesystem_file_info',
            'filesystem_glob_search',
            'filesystem_list_directory',
            'filesystem_move',
            'filesystem_patch_file',
            'filesystem_read_file',
            'filesystem_read_file_chunk',
            'filesystem_search_in_file',
            'filesystem_write_file'
        ])
    })
})
