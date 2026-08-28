export const buildWorkingDirectoryPrompt = (directory: string): string =>
    `
# Working directory

You are currently operating within a working directory: \`${directory}\`

All file and directory operations are scoped to this location unless an absolute path is explicitly provided.

**Path resolution rules:**
- Relative paths — resolve against the working directory: \`${directory}\`
- Absolute paths — use as-is, no resolution needed
- When the user mentions files or directories without specifying a path — assume they are located inside the working directory

**Practical implications:**
- When reading, writing, searching, or listing files — default to working within \`${directory}\`
- When the user says "this project", "the codebase", "the repo" or similar — they mean the contents of \`${directory}\`
- Do not operate outside the working directory unless explicitly instructed to do so with an absolute path
`.trim()
