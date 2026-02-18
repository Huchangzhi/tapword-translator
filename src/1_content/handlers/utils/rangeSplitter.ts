/**
 * Range Splitter
 *
 * Splits a selection Range into sub-ranges scoped by block-level ancestors.
 * Handles partial selections inside a block and skips empty/whitespace-only fragments.
 */

import * as domSanitizer from "@/1_content/utils/domSanitizer"

/** Split a range by block-level ancestors, returning per-block ranges in order. */
export function splitRangeByBlocks(range: Range): Range[] {
    if (range.collapsed) {
        return []
    }

    const root = getWalkerRoot(range)
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode: (node: Node) => {
            if (node.nodeType !== Node.TEXT_NODE) {
                return NodeFilter.FILTER_SKIP
            }
            return domSanitizer.isInsideIgnoredElement(node)
                ? NodeFilter.FILTER_REJECT
                : rangeIntersectsNode(range, node)
                  ? NodeFilter.FILTER_ACCEPT
                  : NodeFilter.FILTER_SKIP
        },
    })

    const ranges: Range[] = []
    let currentBlock: Element | null = null
    let startNode: Node | null = null
    let startOffset = 0
    let endNode: Node | null = null
    let endOffset = 0

    const flush = () => {
        if (!currentBlock || !startNode || !endNode) {
            return
        }
        const subRange = document.createRange()
        subRange.setStart(startNode, startOffset)
        subRange.setEnd(endNode, endOffset)
        if (domSanitizer.getCleanTextFromRange(subRange).trim().length > 0) {
            ranges.push(subRange)
        }
    }

    while (walker.nextNode()) {
        const node = walker.currentNode
        const block = domSanitizer.getClosestBlockAncestor(node)
        const nodeStartOffset = node === range.startContainer ? range.startOffset : 0
        const nodeTextLength = node.textContent ? node.textContent.length : 0
        const nodeEndOffset = node === range.endContainer ? range.endOffset : nodeTextLength

        if (!currentBlock || block !== currentBlock) {
            flush()
            currentBlock = block
            startNode = node
            startOffset = nodeStartOffset
            endNode = node
            endOffset = nodeEndOffset
        } else {
            endNode = node
            endOffset = nodeEndOffset
        }
    }

    flush()
    return ranges
}

function getWalkerRoot(range: Range): Node {
    const root = range.commonAncestorContainer
    if (root.nodeType === Node.TEXT_NODE) {
        return root.parentElement ?? document.body
    }
    return root
}

function rangeIntersectsNode(range: Range, node: Node): boolean {
    try {
        return range.intersectsNode(node)
    } catch (error) {
        try {
            const nodeRange = document.createRange()
            nodeRange.selectNodeContents(node)
            return !(
                range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0 ||
                range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0
            )
        } catch {
            return false
        }
    }
}