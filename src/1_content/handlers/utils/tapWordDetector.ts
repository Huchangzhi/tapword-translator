/**
 * Tap Word Detector
 *
 * Provides helpers to resolve a word range from a click/tap point.
 */

import * as loggerModule from "@/0_common/utils/logger"

const WORD_CHAR_REGEX = /[A-Za-z0-9'-]/
const HIT_TEST_PADDING_PX = 2
const logger = loggerModule.createLogger("tapWordDetector")

export function getWordRangeFromPoint(x: number, y: number): Range | null {
    const caretRange = getCaretRangeFromPoint(x, y)
    if (!caretRange) {
        logger.debug("No caret range at point", { x, y })
        return null
    }

    const wordRange = expandRangeToWord(caretRange)
    if (!wordRange) {
        logger.debug("Failed to expand caret range to word", { x, y })
        return null
    }

    if (!isPointInRects(x, y, wordRange.getClientRects())) {
        logger.debug("Point not within word range rects", { x, y })
        return null
    }

    return wordRange
}

function getCaretRangeFromPoint(x: number, y: number): Range | null {
    const documentWithCaretRange = document as Document & {
        caretRangeFromPoint?: (x: number, y: number) => Range | null
    }
    const documentWithCaretPosition = document as Document & {
        caretPositionFromPoint?: (x: number, y: number) => CaretPosition | null
    }

    if (documentWithCaretRange.caretRangeFromPoint) {
        return documentWithCaretRange.caretRangeFromPoint(x, y)
    }

    const caretPosition = documentWithCaretPosition.caretPositionFromPoint?.(x, y)
    if (!caretPosition) {
        logger.debug("No caret position at point", { x, y })
        return null
    }

    const range = document.createRange()
    range.setStart(caretPosition.offsetNode, caretPosition.offset)
    range.setEnd(caretPosition.offsetNode, caretPosition.offset)
    return range
}

function expandRangeToWord(range: Range): Range | null {
    const node = range.startContainer
    if (!node || node.nodeType !== Node.TEXT_NODE) {
        return null
    }

    const text = node.textContent || ""
    if (text.length === 0) {
        return null
    }

    let index = range.startOffset
    if (index > 0 && !isWordChar(text[index] ?? "") && isWordChar(text[index - 1] ?? "")) {
        index -= 1
    }

    if (!isWordChar(text[index] ?? "")) {
        return null
    }

    let start = index
    while (start > 0 && isWordChar(text[start - 1] ?? "")) {
        start -= 1
    }

    let end = index
    while (end < text.length && isWordChar(text[end] ?? "")) {
        end += 1
    }

    if (start === end) {
        return null
    }

    const wordRange = document.createRange()
    wordRange.setStart(node, start)
    wordRange.setEnd(node, end)
    return wordRange
}

function isPointInRects(x: number, y: number, rects: DOMRectList): boolean {
    for (const rect of Array.from(rects)) {
        const left = rect.left - HIT_TEST_PADDING_PX
        const right = rect.right + HIT_TEST_PADDING_PX
        const top = rect.top - HIT_TEST_PADDING_PX
        const bottom = rect.bottom + HIT_TEST_PADDING_PX
        if (x >= left && x <= right && y >= top && y <= bottom) {
            return true
        }
    }

    return false
}

function isWordChar(ch: string): boolean {
    return WORD_CHAR_REGEX.test(ch)
}