const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA"])
const EDITABLE_SELECTOR = `${Array.from(EDITABLE_TAGS)
    .map((tag) => tag.toLowerCase())
    .join(", ")}, [contenteditable]`
const INTERACTIVE_TAG_SELECTOR =
    "a, button, input, select, textarea, label, video, audio, area, map, summary, details, iframe, embed, object, [contenteditable='true']"
const INTERACTIVE_ROLE_SELECTOR =
    "[role='button'], [role='link'], [role='checkbox'], [role='radio'], [role='switch'], " +
    "[role='option'], [role='menuitem'], [role='menuitemcheckbox'], [role='menuitemradio'], " +
    "[role='tab'], [role='treeitem'], [role='gridcell'], " +
    "[role='combobox'], [role='listbox'], [role='menu'], [role='menubar'], " +
    "[role='tablist'], [role='tree'], [role='treegrid'], [role='grid']"
const INTERACTIVE_SELECTOR = `${INTERACTIVE_TAG_SELECTOR}, ${INTERACTIVE_ROLE_SELECTOR}`
const CLICK_ATTRIBUTE = "onclick"
const TABINDEX_ATTRIBUTE = "tabindex"
const CURSOR_POINTER = "pointer"

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

export function isInteractiveElement(target: EventTarget | null, event?: Event): boolean {
    const element = getElementFromTarget(target)
    if (!element) {
        return false
    }

    if (event?.composedPath) {
        const path = event.composedPath()
        for (const node of path) {
            if (node instanceof HTMLElement && isInteractiveElementSelf(node, node === element)) {
                return true
            }
        }
        return false
    }

    return isInteractiveElementByClosest(element)
}

function getElementFromTarget(target: EventTarget | null): HTMLElement | null {
    if (!target) {
        return null
    }

    if (target instanceof HTMLElement) {
        return target
    }

    if (target instanceof Text) {
        return target.parentElement
    }

    return null
}

function isInteractiveElementSelf(node: HTMLElement, checkCursor: boolean): boolean {
    if (node.isContentEditable) {
        return true
    }

    if (node.matches(INTERACTIVE_TAG_SELECTOR)) {
        return true
    }

    if (node.matches(INTERACTIVE_ROLE_SELECTOR)) {
        return true
    }

    if (node.hasAttribute(CLICK_ATTRIBUTE)) {
        return true
    }

    if (node.hasAttribute(TABINDEX_ATTRIBUTE)) {
        const tabIndex = parseInt(node.getAttribute(TABINDEX_ATTRIBUTE) || "-1", 10)
        if (tabIndex >= 0) {
            return true
        }
    }

    if (checkCursor) {
        const style = window.getComputedStyle(node)
        if (style.cursor === CURSOR_POINTER) {
            return true
        }
    }

    return false
}

function isInteractiveElementByClosest(node: HTMLElement): boolean {
    if (node.closest(INTERACTIVE_SELECTOR)) {
        return true
    }

    if (node.closest(`[${CLICK_ATTRIBUTE}]`)) {
        return true
    }

    let current: HTMLElement | null = node
    while (current && current !== document.body) {
        if (current.hasAttribute(TABINDEX_ATTRIBUTE)) {
            const tabIndex = parseInt(current.getAttribute(TABINDEX_ATTRIBUTE) || "-1", 10)
            if (tabIndex >= 0) {
                return true
            }
        }
        current = current.parentElement
    }

    const style = window.getComputedStyle(node)
    if (style.cursor === CURSOR_POINTER) {
        return true
    }

    return false
}