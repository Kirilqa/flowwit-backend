import { formatMessage } from '@/channels/telegram/utils/formatMessage'

describe('formatMessage', () => {
    it('escapes HTML special characters', () => {
        expect(formatMessage('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d')
    })

    it('converts **bold** to <b>', () => {
        expect(formatMessage('**bold**')).toBe('<b>bold</b>')
    })

    it('converts __bold__ to <b>', () => {
        expect(formatMessage('__bold__')).toBe('<b>bold</b>')
    })

    it('converts *italic* to <i>', () => {
        expect(formatMessage('*italic*')).toBe('<i>italic</i>')
    })

    it('converts _italic_ to <i>', () => {
        expect(formatMessage('_italic_')).toBe('<i>italic</i>')
    })

    it('converts ~~strikethrough~~ to <s>', () => {
        expect(formatMessage('~~gone~~')).toBe('<s>gone</s>')
    })

    it('converts `inline code` to <code>, escaping HTML inside it', () => {
        expect(formatMessage('`a < b`')).toBe('<code>a &lt; b</code>')
    })

    it('converts markdown links to <a href="...">', () => {
        expect(formatMessage('[click me](https://example.com)')).toBe('<a href="https://example.com">click me</a>')
    })

    it('converts a heading to <b>', () => {
        expect(formatMessage('## Title')).toBe('<b>Title</b>')
    })

    it('converts a fenced code block to <pre><code>, escaping HTML inside it', () => {
        expect(formatMessage('```\nconst a = 1 < 2\n```')).toBe('<pre><code>const a = 1 &lt; 2\n</code></pre>')
    })

    it('ignores the language tag on a fenced code block', () => {
        expect(formatMessage('```ts\nconst a = 1\n```')).toBe('<pre><code>const a = 1\n</code></pre>')
    })

    it('formats inline markdown before and after a code block', () => {
        expect(formatMessage('**before**\n```\ncode\n```\n*after*')).toBe(
            '<b>before</b>\n<pre><code>code\n</code></pre>\n<i>after</i>'
        )
    })

    it('does not apply inline formatting inside a code block', () => {
        expect(formatMessage('```\n**not bold**\n```')).toBe('<pre><code>**not bold**\n</code></pre>')
    })

    it('returns plain text unchanged aside from HTML escaping', () => {
        expect(formatMessage('just plain text')).toBe('just plain text')
    })

    it('handles an empty string', () => {
        expect(formatMessage('')).toBe('')
    })
})
