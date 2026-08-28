import { InlineKeyboard } from 'grammy'

const PAGE_SIZE = 10

export function buildPaginatedKeyboard<ItemType>(
    items: ReadonlyArray<ItemType>,
    page: number,
    prefix: string,
    getLabel: (item: ItemType) => string,
    getCallbackData: (item: ItemType) => string
): InlineKeyboard {
    const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    const keyboard = new InlineKeyboard()

    for (const item of pageItems) {
        keyboard.text(getLabel(item), getCallbackData(item)).row()
    }

    const hasPrev = page > 0
    const hasNext = (page + 1) * PAGE_SIZE < items.length

    if (hasPrev || hasNext) {
        if (hasPrev) keyboard.text('◀', `${prefix}:page:${page - 1}`)
        if (hasNext) keyboard.text('▶', `${prefix}:page:${page + 1}`)
    }

    return keyboard
}
