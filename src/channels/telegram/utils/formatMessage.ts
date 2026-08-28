function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatInline(text: string): string {
    return escapeHtml(text)
        .replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>')
        .replace(/__([\s\S]*?)__/g, '<b>$1</b>')
        .replace(/\*([\s\S]*?)\*/g, '<i>$1</i>')
        .replace(/_([\s\S]*?)_/g, '<i>$1</i>')
        .replace(/~~([\s\S]*?)~~/g, '<s>$1</s>')
        .replace(/`([^`\n]+)`/g, (_, code: string) => `<code>${code}</code>`)
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/^#{1,6}\s+(.+)$/gm, '<b>$1</b>')
}

export function formatMessage(text: string): string {
    const parts: Array<string> = []
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = codeBlockRegex.exec(text)) !== null) {
        parts.push(formatInline(text.slice(lastIndex, match.index)))
        const code = escapeHtml(match[2] ?? '')
        parts.push(`<pre><code>${code}</code></pre>`)
        lastIndex = match.index + match[0].length
    }

    parts.push(formatInline(text.slice(lastIndex)))

    return parts.join('')
}
