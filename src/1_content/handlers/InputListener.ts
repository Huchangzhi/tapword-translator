/**
 * Input Listener
 *
 * Handles DOM events and translates user intent into pipeline calls.
 */

import { DEFAULT_USER_SETTINGS } from "@/0_common/types"
import * as loggerModule from "@/0_common/utils/logger"
import * as constants from "@/1_content/constants"
import * as contentIndex from "@/1_content/index"
import * as iconManager from "@/1_content/ui/iconManager"
import { expandRangeToSentence } from "@/1_content/utils/contextExtractorV2"
import * as domSanitizer from "@/1_content/utils/domSanitizer"
import * as translationPipeline from "@/1_content/handlers/TranslationPipeline"
import * as editableElementDetector from "@/1_content/handlers/utils/editableElementDetector"
import * as tapWordDetector from "@/1_content/handlers/utils/tapWordDetector"
import { validateSelectionAsync } from "@/1_content/handlers/utils/selectionValidator"

const logger = loggerModule.createLogger("selectionHandler")
const SINGLE_WORD_WHITESPACE_REGEX = /\s/
const SINGLE_CLICK_TRIGGER_LABEL = "Single Click"

/**
 * Handle text selection on the page
 */
export async function handleTextSelection(): Promise<void> {
    const selection = window.getSelection()
    const settings = contentIndex.getCachedUserSettings()

    const validation = await validateSelectionAsync(selection, settings, "icon")

    if (!validation.isValid) {
        if (validation.shouldCleanup) {
            iconManager.removeTranslationIcon()
        }
        if (validation.reason) {
            logger.debug(`Selection validation failed: ${validation.reason}`)
        }
        return
    }

    const range = validation.range!

    // Create a click handler that captures the current selection and range.
    const onIconClick = (event: Event) => {
        event.stopPropagation()
        translationPipeline.handleIconClick(selection!, range)
    }

    // Get icon color from settings
    const iconColor = settings?.iconColor ?? "pink"

    // Show the icon
    iconManager.showTranslationIcon(range, onIconClick, iconColor)
}

/**
 * Handle single-click to trigger word translation
 */
export async function handleSingleClick(event: MouseEvent): Promise<void> {
    if (event.button !== 0 || event.defaultPrevented) {
        return
    }

    if (editableElementDetector.isInteractiveElement(event.target, event)) {
        return
    }

    if (isContentScriptUiTarget(event.target)) {
        return
    }

    const selection = window.getSelection()
    if (selection && !selection.isCollapsed) {
        return
    }

    const range = tapWordDetector.getWordRangeFromPoint(event.clientX, event.clientY)
    if (!range) {
        return
    }

    const sanitizedText = domSanitizer.getCleanTextFromRange(range).trim()
    if (!sanitizedText || SINGLE_WORD_WHITESPACE_REGEX.test(sanitizedText)) {
        return
    }

    iconManager.removeTranslationIcon()

    await translationPipeline.triggerTranslationForRange(range, SINGLE_CLICK_TRIGGER_LABEL, "text")
}

/**
 * Handle double-click to trigger direct translation
 */
export async function handleDoubleClick(event: MouseEvent): Promise<void> {
    const settings = contentIndex.getCachedUserSettings()
    const selection = window.getSelection()

    const validation = await validateSelectionAsync(selection, settings, "doubleClick")

    if (!validation.isValid) {
        if (validation.shouldCleanup) {
            iconManager.removeTranslationIcon()
        }
        if (validation.reason) {
            logger.debug(`Double-click validation failed: ${validation.reason}`)
        }
        return
    }

    // Must remove icon if proceeding (double click started)
    iconManager.removeTranslationIcon()

    let range = validation.range!

    // Check for configured modifier key to trigger sentence translation
    const userSettings = contentIndex.getCachedUserSettings() ?? DEFAULT_USER_SETTINGS
    const sentenceModeEnabled = userSettings.doubleClickSentenceTranslate ?? true
    const triggerKey = userSettings.doubleClickSentenceTriggerKey ?? "alt"

    let isSentenceMode = false
    if (sentenceModeEnabled) {
        if (triggerKey === "meta") isSentenceMode = event.metaKey
        else if (triggerKey === "option" || triggerKey === "alt") isSentenceMode = event.altKey
        else if (triggerKey === "ctrl") isSentenceMode = event.ctrlKey
    }

    if (isSentenceMode) {
        logger.info(`Modifier key (${triggerKey}) pressed, expanding selection to full sentence.`)
        range = expandRangeToSentence(range)
    }

    // Clear the selection to remove the browser's native highlight
    if (selection) {
        selection.removeAllRanges()
    }

    const baseLabel = isSentenceMode ? "Double Click (Sentence)" : "Double Click"
    await translationPipeline.triggerTranslationWithSplit(range, baseLabel)
}

/**
 * Handle clicks outside selection to hide icon
 */
export function handleDocumentClick(event: Event): void {
    const target = event.target as Element

    // Don't hide if clicking on our icon or tooltip
    if (target.closest(`.${constants.CSS_CLASSES.ICON}`) || target.closest(`.${constants.CSS_CLASSES.ANCHOR}`)) {
        return
    }

    // Hide icon on outside clicks
    iconManager.removeTranslationIcon()
}

function isContentScriptUiTarget(target: EventTarget | null): boolean {
    if (!target) {
        return false
    }

    if (!(target instanceof Element)) {
        return false
    }

    return (
        target.closest(`.${constants.CSS_CLASSES.ICON}`) !== null ||
        target.closest(`.${constants.CSS_CLASSES.ANCHOR}`) !== null ||
        target.closest(`.${constants.CSS_CLASSES.TOOLTIP}`) !== null ||
        target.closest(`.${constants.CSS_CLASSES.MODAL}`) !== null ||
        target.closest(`.${constants.CSS_CLASSES.MODAL_BACKDROP}`) !== null
    )
}