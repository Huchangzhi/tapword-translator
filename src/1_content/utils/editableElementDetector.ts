const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA"])

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

    const closestEditable = element.closest("input, textarea, [contenteditable]")
    if (!closestEditable) {
        return false
    }

    return isDirectlyEditable(closestEditable)
}
