const formatZonedDateTime = (now: Date, timeZone: string): string => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'long',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(now)

    const get = (type: Intl.DateTimeFormatPartTypes): string => parts.find(part => part.type === type)?.value ?? ''

    return `${get('weekday')}, ${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')} (${timeZone})`
}

export const buildDateTimePrompt = (userTimezone?: string): string => {
    const now = new Date()
    const serverTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const serverLine = `Server time: ${formatZonedDateTime(now, serverTimezone)}`

    if (!userTimezone) {
        return `
# Current date and time

${serverLine}

The user's local time zone is not configured, so this is the only known reference point. Treat it as ground truth for "today", "tomorrow", weekday references, and scheduling — never calculate or guess the current date/time yourself.
`.trim()
    }

    const userLine = `User time: ${formatZonedDateTime(now, userTimezone)}`

    return `
# Current date and time

${serverLine}
${userLine}

Treat both as ground truth — never calculate or guess the current date/time yourself. When the user references a date or time in conversation (e.g. "on Thursday", "tomorrow morning"), reason in the user's time zone. When scheduling tasks for the Scheduler, reason in the server's time zone.
`.trim()
}
