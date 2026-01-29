/**
 * Selection Validator Utility
 *
 * Centralizes validation logic for text selections to determine if translation should be triggered.
 */
import { type UserSettings } from "@/0_common/types"
import * as loggerModule from "@/0_common/utils/logger"
import * as constants from "@/1_content/constants"
import * as domSanitizer from "@/1_content/utils/domSanitizer"
import * as editableElementDetector from "@/1_content/utils/editableElementDetector"

import { shouldTriggerTranslationAsync } from "@/1_content/utils/languageValidator"

const logger = loggerModule.createLogger("selectionValidator")

const ELEMENT_NODE = 1

export type ValidationTrigger = "icon" | "doubleClick"

export interface ValidationResult {
    isValid: boolean
    text: string
    range?: Range
    reason?: string
    shouldCleanup?: boolean // true if the caller should remove the icon/cancel UI
}

/**
 * Validates whether the current selection should trigger a translation action (icon or direct).
 *
 * @param selection - The current selection object
 * @param settings - The user settings
 * @param trigger - The type of trigger ('icon' or 'doubleClick')
 * @returns Promise<ValidationResult> object containing validity status, extracted text, and optional range/reason
 */
export async function validateSelectionAsync(
    selection: Selection | null,
    settings: UserSettings | null,
    trigger: ValidationTrigger
): Promise<ValidationResult> {
    // 1. Basic Selection Check
    if (!selection || selection.rangeCount === 0) {
        return { isValid: false, text: "", reason: "No valid selection", shouldCleanup: true }
    }

    // 2. Global Settings Check
    const enableTapWord = settings?.enableTapWord ?? true
    if (!enableTapWord) {
        return { isValid: false, text: "", reason: "Extension disabled via enableTapWord", shouldCleanup: true }
    }

    // 3. Trigger-specific Settings Check
    if (trigger === "icon") {
        const showIcon = settings?.showIcon ?? true
        if (!showIcon) {
            // Original logic: just return, don't explicitly remove icon (though often desirable, we stick to original)
            return { isValid: false, text: "", reason: "Icon disabled via settings", shouldCleanup: false }
        }
    } else if (trigger === "doubleClick") {
        const doubleClickTranslate = settings?.doubleClickTranslate ?? true
        if (!doubleClickTranslate) {
            return { isValid: false, text: "", reason: "Double-click translation disabled via settings", shouldCleanup: false }
        }
    }

    // 4. Text Extraction & Validation
    const range = selection.getRangeAt(0)
    const rawText = domSanitizer.getCleanTextFromRange(range)
    const selectedText = rawText.trim()

    if (selectedText.length === 0) {
        return { isValid: false, text: "", reason: "Empty selection", shouldCleanup: true }
    }

    // 5. Length Check
    if (selectedText.length > constants.MAX_SELECTION_LENGTH) {
        return {
            isValid: false,
            text: selectedText,
            reason: `Selection too long (${selectedText.length} chars)`,
            shouldCleanup: true,
        }
    }

    // 6. Contentless Check (Numeric, Symbols, Punctuation only)
    // Matches if the string consists entirely of Numbers, Whitespace, Punctuation, or Symbols
    if (/^[\d\s\p{P}\p{S}]+$/u.test(selectedText)) {
        return { isValid: false, text: selectedText, reason: "Contentless selection skipped", shouldCleanup: false }
    }

    // 7. Language Suppression Check
    const suppressNativeLanguage = settings?.suppressNativeLanguage ?? true
    if (suppressNativeLanguage) {
        const targetLang = settings?.targetLanguage || "zh"
        // Extract context for language detection (async)
        // Use surrounding text to get better accuracy for short selections
        const contextText = domSanitizer.getSurroundingTextForDetection(range, 100)

        const shouldTrigger = await shouldTriggerTranslationAsync(selectedText, targetLang, contextText)
        if (!shouldTrigger) {
            return { isValid: false, text: selectedText, reason: "Suppressed by language detector", shouldCleanup: true }
        }
    }

    // 8. DOM/Element Checks
    const container = range.commonAncestorContainer
    const element = container.nodeType === ELEMENT_NODE ? (container as Element) : container.parentElement

    if (editableElementDetector.isEditableElement(element)) {
        return { isValid: false, text: selectedText, reason: "Selection inside editable element", shouldCleanup: true }
    }

    if (element?.closest(`.${constants.CSS_CLASSES.ICON}, .${constants.CSS_CLASSES.TOOLTIP}, .${constants.CSS_CLASSES.ANCHOR}`)) {
        return { isValid: false, text: selectedText, reason: "Selection inside extension UI", shouldCleanup: false }
    }

    return { isValid: true, text: selectedText, range, reason: "Valid selection", shouldCleanup: false }
}