const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA"])
const EDITABLE_SELECTOR = `${Array.from(EDITABLE_TAGS)
    .map((tag) => tag.toLowerCase())
    .join(", ")}, [contenteditable]`

function isDirectlyEditable(element: Element): boolean {
    if (EDITABLE_TAGS.has(element.tagName)) {
        return true
    }

    if (element instanceof HTMLElement && element.isContentEditable) {
        return true
    }

    return false
}

export function isEditableElement(element: Element | null): boolean {
    if (!element) {
        return false
    }

    if (isDirectlyEditable(element)) {
        return true
    }

    const closestEditable = element.closest(EDITABLE_SELECTOR)
    if (!closestEditable) {
        return false
    }

    return isDirectlyEditable(closestEditable)
}
