/**
 * Selection Handler
 *
 * Handles text selection detection and validation
 */

import { ERROR_MESSAGES, UPGRADE_MODEL_ENABLED } from "@/0_common/constants"
import * as translationFontSizeModule from "@/0_common/constants/translationFontSize"
import type { TranslationFontSizePreset } from "@/0_common/types"
import * as i18nModule from "@/0_common/utils/i18n"
import * as loggerModule from "@/0_common/utils/logger"
import * as constants from "@/1_content/constants"
import * as contentIndex from "@/1_content/index"
import * as translationRequest from "@/1_content/services/translationRequest"
import * as iconManager from "@/1_content/ui/iconManager"
import * as translationDisplay from "@/1_content/ui/translationDisplay"
import { extractContextV2 } from "@/1_content/utils/contextExtractorV2"
import * as domSanitizer from "@/1_content/utils/domSanitizer"
import * as languageDetector from "@/1_content/utils/languageDetector"
import * as editableElementDetector from "@/1_content/utils/editableElementDetector"
import * as rangeSplitter from "@/1_content/utils/rangeSplitter"
import * as rangeAdjuster from "@/1_content/utils/rangeAdjuster"
import * as selectionClassifier from "@/1_content/utils/selectionClassifier"
import * as translationOverlapDetector from "@/1_content/utils/translationOverlapDetector"
import * as storageManager from "@/0_common/utils/storageManager"
import { createConcurrencyLimiter, type RequestLimiter } from "@/1_content/utils/concurrencyLimiter"

const logger = loggerModule.createLogger("selectionHandler")
const MAX_PARALLEL_TRANSLATIONS = 3

function buildDisplaySettings(settings: Partial<{ translationFontSizePreset?: TranslationFontSizePreset; autoAdjustHeight?: boolean }> | null) {
    const resolvedFont = translationFontSizeModule.resolveTranslationFontSize(settings?.translationFontSizePreset)

    return {
        translationFontSizePreset: resolvedFont.preset,
        translationFontSize: resolvedFont.px,
        autoAdjustHeight: settings?.autoAdjustHeight ?? true,
    }
}

/**
 * Triggers the translation process for a given selection and range.
 * This function is called when the translation icon is clicked.
 * @param selection - The captured Selection object.
 * @param range - The captured Range object.
 */
async function handleIconClick(selection: Selection, range: Range): Promise<void> {
    if (!selection || !range) {
        logger.warn("No selection available for translation.")
        return
    }

    const container = range.commonAncestorContainer
    const element = container.nodeType === Node.ELEMENT_NODE ? (container as Element) : container.parentElement

    if (editableElementDetector.isEditableElement(element)) {
        logger.info("Icon click inside an editable element, skipping translation.")
        iconManager.removeTranslationIcon()
        return
    }

    // Remove the icon
    iconManager.removeTranslationIcon()

    // Delegate to core translation logic, splitting multi-block selections into per-block translations
    const splitRanges = rangeSplitter.splitRangeByBlocks(range)
    const targets = splitRanges.length > 0 ? splitRanges : [range]

    const triggerLabel = splitRanges.length > 1 ? "Icon Click (Split)" : "Icon Click"
    const limiter = createConcurrencyLimiter(MAX_PARALLEL_TRANSLATIONS)
    const loadingVariant: "text" | "spinner" = targets.length > 1 ? "spinner" : "text"
    await runBatchedTranslations(triggerLabel, targets, limiter, loadingVariant)
}

/**
 * Handle text selection on the page
 */
export function handleTextSelection(): void {
    const selection = window.getSelection()

    // Check if we have valid selection
    if (!selection || selection.rangeCount === 0) {
        iconManager.removeTranslationIcon()
        return
    }

    // Check user setting for master enable and icon visibility early
    const settings = contentIndex.getCachedUserSettings()
    const enableTapWord = settings?.enableTapWord ?? true
    if (!enableTapWord) {
        iconManager.removeTranslationIcon()
        return
    }

    const showIcon = settings?.showIcon ?? true // Default to true if settings not loaded
    if (!showIcon) {
        // Icon is disabled, don't show it but still allow double-click translation
        return
    }

    const range = selection.getRangeAt(0)
    const rawText = domSanitizer.getCleanTextFromRange(range)
    const selectedText = rawText.trim()

    // Only show icon for non-empty selections
    if (selectedText.length === 0) {
        iconManager.removeTranslationIcon()
        return
    }

    // Do not show icon for excessively long selections
    if (selectedText.length > constants.MAX_SELECTION_LENGTH) {
        logger.info(`Selection too long (${selectedText.length} chars), hiding icon.`)
        iconManager.removeTranslationIcon()
        return
    }

    // Ignore selections within our own UI elements
    const container = range.commonAncestorContainer
    const element = container.nodeType === Node.ELEMENT_NODE ? (container as Element) : container.parentElement

    if (editableElementDetector.isEditableElement(element)) {
        iconManager.removeTranslationIcon()
        return
    }

    if (element?.closest(`.${constants.CSS_CLASSES.ICON}, .${constants.CSS_CLASSES.TOOLTIP}, .${constants.CSS_CLASSES.ANCHOR}`)) {
        return
    }

    // Create a click handler that captures the current selection and range.
    const onIconClick = (event: Event) => {
        event.stopPropagation()
        handleIconClick(selection, range)
    }

    // Get icon color from settings
    const iconColor = settings?.iconColor ?? "pink"

    // Show the icon
    iconManager.showTranslationIcon(range, onIconClick, iconColor)
}

/**
 * Handle double-click to trigger direct translation
 */
export async function handleDoubleClick(): Promise<void> {
    // Check user setting for master enable
    const settings = contentIndex.getCachedUserSettings()
    const enableTapWord = settings?.enableTapWord ?? true
    if (!enableTapWord) {
        iconManager.removeTranslationIcon()
        return
    }

    const doubleClickTranslate = settings?.doubleClickTranslate ?? true // Default to true if settings not loaded
    if (!doubleClickTranslate) {
        // Double-click translation is disabled
        return
    }

    // Immediately remove the icon that was shown on mouseup
    iconManager.removeTranslationIcon()

    const selection = window.getSelection()

    // Check if we have valid selection
    if (!selection || selection.rangeCount === 0) {
        return
    }

    const range = selection.getRangeAt(0)
    const selectedText = domSanitizer.getCleanTextFromRange(range).trim()

    // Only trigger for non-empty selections (double-click automatically selects a word)
    if (selectedText.length === 0) {
        return
    }

    // Do not trigger for pure numbers
    if (/^\d+$/.test(selectedText)) {
        logger.info("Selection is a pure number, skipping translation.")
        return
    }

    // Do not trigger for excessively long selections
    if (selectedText.length > constants.MAX_SELECTION_LENGTH) {
        logger.info(`Double-click selection too long (${selectedText.length} chars), aborting translation.`)
        return
    }

    // Ignore double-clicks within our own UI elements
    const container = range.commonAncestorContainer
    const element = container.nodeType === Node.ELEMENT_NODE ? (container as Element) : container.parentElement

    if (editableElementDetector.isEditableElement(element)) {
        logger.info("Selection is inside an editable element, skipping translation.")
        return
    }

    if (element?.closest(`.${constants.CSS_CLASSES.ICON}, .${constants.CSS_CLASSES.TOOLTIP}, .${constants.CSS_CLASSES.ANCHOR}`)) {
        return
    }

    // Delegate to core translation logic, splitting multi-block selections into per-block translations
    const splitRanges = rangeSplitter.splitRangeByBlocks(range)
    const targets = splitRanges.length > 0 ? splitRanges : [range]

    const triggerLabel = splitRanges.length > 1 ? "Double Click (Split)" : "Double Click"
    const limiter = createConcurrencyLimiter(MAX_PARALLEL_TRANSLATIONS)
    const loadingVariant: "text" | "spinner" = targets.length > 1 ? "spinner" : "text"
    await runBatchedTranslations(triggerLabel, targets, limiter, loadingVariant)
}

async function runBatchedTranslations(
    triggerLabel: string,
    ranges: Range[],
    limiter: RequestLimiter,
    loadingVariant: "text" | "spinner"
): Promise<void> {
    await Promise.all(ranges.map((targetRange) => processTranslation(targetRange, triggerLabel, limiter, loadingVariant)))
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

/**
 * Core translation logic that handles language detection and routing.
 * Shared by both icon click and double-click handlers.
 *
 * @param range - The Range object containing the selected text
 * @param triggerSource - Source of the trigger for logging purposes
 */
async function processTranslation(
    range: Range,
    triggerSource: string,
    limiter?: RequestLimiter,
    loadingVariant: "text" | "spinner" = "text"
): Promise<void> {
    // Sanitize selection text to exclude our UI (e.g., tooltip content)
    const rawText = domSanitizer.getCleanTextFromRange(range)
    const sanitizedText = rawText.trim()
    logger.info(`[${triggerSource}] Translation requested for:`, sanitizedText)

    // Get surrounding text from block ancestor for more accurate language detection
    const textForDetection = domSanitizer.getSurroundingTextForDetection(range, 30)

    // Detect language to determine handling strategy
    const detectedLang = await languageDetector.detectSourceLanguageAsync(textForDetection)
    logger.info(`[${triggerSource}] Detected language:`, detectedLang)

    // Check if the language is CJK (Chinese, Japanese, Korean) or similar non-space-delimited languages
    const isCJKLanguage = ["zh", "ja", "ko"].includes(detectedLang)

    if (isCJKLanguage) {
        // For CJK languages: Trust user's selection, skip classification and expansion
        // These languages don't use spaces to separate words, so user selection is the most reliable unit
        logger.info(`[${triggerSource}] [CJK Language] Treating selection as fragment, skipping classification and expansion`)
        const trimRes = rangeAdjuster.trimBoundaryWhitespace(range)
        const workingRange = trimRes.range
        const fragment = domSanitizer.getCleanTextFromRange(workingRange).trim()
        await translateFragmentPath(workingRange, fragment, detectedLang, limiter, loadingVariant)
    } else {
        // For space-delimited languages (English, etc.): Use existing classification and expansion logic
        logger.info(`[${triggerSource}] [Space-delimited Language] Using classification and boundary expansion`)

        // Step 1: Trim boundary whitespace (prevents expanding into next word when trailing space selected)
        const trimRes = rangeAdjuster.trimBoundaryWhitespace(range)
        let workingRange = trimRes.range

        // Step 2: Classify selection based on trimmed range
        const cls = selectionClassifier.detectSelectionType(workingRange)

        // Step 3: Adjust range based on classification rules
        if (cls.type === "word") {
            if (!cls.isComplete) {
                const exp = rangeAdjuster.expandToWordBoundaries(workingRange)
                workingRange = exp.range
            }
            const word = domSanitizer.getCleanTextFromRange(workingRange).trim()
            await translateWordPath(workingRange, word, detectedLang, limiter, loadingVariant)
        } else {
            // Fragment: if boundary whitespace was trimmed, skip expansion; else expand to word boundaries
            if (!cls.isComplete) {
                const exp = rangeAdjuster.expandToWordBoundaries(workingRange)
                workingRange = exp.range
            }
            const fragment = domSanitizer.getCleanTextFromRange(workingRange).trim()
            await translateFragmentPath(workingRange, fragment, detectedLang, limiter, loadingVariant)
        }
    }
}

// ============================================================================
// Translation Path Functions
// ============================================================================

/**
 * Word translation path - uses translateWord API
 *
 * @param range - Selection range
 * @param word - The word to translate
 * @param detectedLang - Pre-detected source language from processTranslation
 */
async function translateWordPath(
    range: Range,
    word: string,
    detectedLang: string,
    limiter?: RequestLimiter,
    loadingVariant: "text" | "spinner" = "text"
): Promise<void> {
    logger.info("[Word Path] Translating word:", word, "| Language:", detectedLang)

    // IMPORTANT: Extract context BEFORE any DOM mutations (wrap/cleanup)
    const v2 = extractContextV2(range)

    const context = {
        word,
        leadingText: v2.leadingText,
        trailingText: v2.trailingText,
        originalSentence: v2.currentSentence,
        previousSentences: v2.previousSentences.length ? v2.previousSentences : undefined,
        nextSentences: v2.nextSentences.length ? v2.nextSentences : undefined,
        bookName: `网页<<${document.title}>>`,
        sourceLanguage: detectedLang, // Use pre-detected language
    }

    // Fetch latest user settings once before rendering to avoid stale values
    const userSettings = await storageManager.getUserSettings()
    const displaySettings = buildDisplaySettings(userSettings)

    // Create refresh callback that re-triggers this translation with latest settings
    let anchorId = ""
    const performRequest = async (upgradeModel: boolean = UPGRADE_MODEL_ENABLED) => {
        try {
            const userTargetLang = userSettings?.targetLanguage || contentIndex.getCachedUserSettings()?.targetLanguage || "zh" // Fallback to 'zh'
            const targetLang = languageDetector.resolveTargetLanguage(detectedLang, userTargetLang)
            logger.info("[Word Path] Target language:", targetLang, "(user setting:", userTargetLang, ")")

            const payload = {
                ...context,
                targetLanguage: targetLang,
                ...(upgradeModel && { upgradeModel: true }),
            }
            const requestFn = () => translationRequest.requestTranslation(payload)
            const response = limiter ? await limiter(requestFn) : await requestFn()
            if (response.success) {
                translationDisplay.updateTranslationResult(
                    anchorId,
                    {
                        status: "success",
                        translation: response.data.wordTranslation,
                        sentenceTranslation: response.data.sentenceTranslation,
                        chineseDefinition: response.data.chineseDefinition,
                        englishDefinition: response.data.englishDefinition,
                        targetDefinition: response.data.targetDefinition,
                        targetLanguage: targetLang,
                        lemma: response.data.lemma,
                        phonetic: response.data.phonetic,
                        lemmaPhonetic: response.data.lemmaPhonetic,
                    },
                    displaySettings
                )
            } else {
                // Check errorType to determine error handling
                // QuotaExceeded: use short message for tooltip, keep detailed message for modal
                // TranslationError: use the specific error message from backend
                // GenericError: use fallback SERVER_BUSY message
                let tooltipText = response.shortMessage || "翻译失败"
                let errorMessage: string = ERROR_MESSAGES.SERVER_BUSY

                if (response.errorType === "QuotaExceeded") {
                    tooltipText = response.shortMessage || ERROR_MESSAGES.QUOTA_EXCEEDED_SHORT
                    errorMessage = response.error // Keep detailed message for modal
                } else if (response.errorType === "TranslationError") {
                    errorMessage = response.error
                }

                translationDisplay.updateTranslationResult(
                    anchorId,
                    {
                        status: "error",
                        text: tooltipText,
                        errorMessage: errorMessage,
                    },
                    displaySettings
                )
                logger.error("Word translation error:", response.error)
            }
        } catch (error) {
            translationDisplay.updateTranslationResult(
                anchorId,
                {
                    status: "error",
                    text: "翻译失败",
                    errorMessage: ERROR_MESSAGES.SERVER_BUSY,
                },
                displaySettings
            )
            logger.error("Word translation request failed:", error)
        }
    }

    // Detect overlapping translations BEFORE wrapping (collect IDs only)
    const preWrapOverlappingIds = translationOverlapDetector.detectOverlappingTranslations(range)

    // Show loading state with full context and refresh callback (this wraps the selection)
    const refreshCallback = async () => {
        logger.info("[Word Path] Refreshing translation for:", word)
        await performRequest(true)
    }
    anchorId = translationDisplay.showTranslationResult(
        range,
        word,
        {
            status: "loading",
            text: i18nModule.translate("modal.loading"),
            loadingVariant,
        },
        context,
        refreshCallback,
        "word", // Specify this is a word translation
        displaySettings
    )

    // After wrapping, remove ALL instances of pre-detected overlapping anchors by ID
    // This handles cases where a previous anchor was split and duplicated (nested clone + leftover)
    try {
        const toRemove = preWrapOverlappingIds.filter((id) => id !== anchorId)
        if (toRemove.length > 0) {
            logger.info("[Word Path] Removing overlapping translations after wrap:", toRemove)
            toRemove.forEach((id) => {
                // Remove every instance with this ID until none remain
                // (defensive: in case partial overlaps created duplicates)
                while (document.getElementById(id)) {
                    translationDisplay.removeTranslationResult(id)
                }
            })
        }
    } catch (e) {
        logger.warn("[Word Path] Overlap cleanup after wrap failed:", e)
    }

    // Begin async language detection and then request translation
    await performRequest()
}

/**
 * Fragment translation path - uses translateFragment API
 *
 * @param range - Selection range (possibly expanded)
 * @param fragment - The text fragment to translate
 * @param detectedLang - Pre-detected source language from processTranslation
 */
async function translateFragmentPath(
    range: Range,
    fragment: string,
    detectedLang: string,
    limiter?: RequestLimiter,
    loadingVariant: "text" | "spinner" = "text"
): Promise<void> {
    logger.info("[Fragment Path] Translating fragment:", fragment, "| Language:", detectedLang)

    // IMPORTANT: Extract context BEFORE any DOM mutations (wrap/cleanup)
    logger.info("[Fragment Path] Extracting context before wrap/cleanup")
    const v2 = extractContextV2(range)

    const context = {
        word: fragment, // for UI typing convenience; not used by fragment request
        leadingText: v2.leadingText,
        trailingText: v2.trailingText,
        originalSentence: v2.currentSentence,
        previousSentences: v2.previousSentences.length ? v2.previousSentences : undefined,
        nextSentences: v2.nextSentences.length ? v2.nextSentences : undefined,
        bookName: `网页<<${document.title}>>`,
        sourceLanguage: detectedLang, // Use pre-detected language
    }

    logger.info("[Fragment Path] Context extracted:", {
        leadingText: context.leadingText,
        trailingText: context.trailingText,
        fragment: fragment,
    })

    // Fetch latest user settings once before rendering to avoid stale values
    const userSettings = await storageManager.getUserSettings()
    const displaySettings = buildDisplaySettings(userSettings)

    // Prepare async performRequest
    let anchorId = ""
    const performFragmentRequest = async (upgradeModel: boolean = UPGRADE_MODEL_ENABLED) => {
        try {
            const userTargetLang = userSettings?.targetLanguage || contentIndex.getCachedUserSettings()?.targetLanguage || "zh" // Fallback to 'zh'
            const targetLang = languageDetector.resolveTargetLanguage(detectedLang, userTargetLang)
            logger.info("[Fragment Path] Target language:", targetLang, "(user setting:", userTargetLang, ")")

            const requestPayload = {
                fragment,
                leadingText: context.leadingText,
                trailingText: context.trailingText,
                previousSentences: context.previousSentences,
                nextSentences: context.nextSentences,
                bookName: context.bookName,
                sourceLanguage: detectedLang,
                targetLanguage: targetLang,
                ...(upgradeModel && { upgradeModel: true }),
            }
            const requestFn = () => translationRequest.requestFragmentTranslation(requestPayload)
            const response = limiter ? await limiter(requestFn) : await requestFn()
            if (response.success) {
                translationDisplay.updateTranslationResult(
                    anchorId,
                    {
                        status: "success",
                        translation: response.data.translation,
                        sentenceTranslation: response.data.sentenceTranslation,
                    },
                    displaySettings
                )
            } else {
                // Check errorType to determine error handling
                // QuotaExceeded: use short message for tooltip, keep detailed message for modal
                // TranslationError: use the specific error message from backend
                // GenericError: use fallback SERVER_BUSY message
                let tooltipText = response.shortMessage || "翻译失败"
                let errorMessage: string = ERROR_MESSAGES.SERVER_BUSY

                if (response.errorType === "QuotaExceeded") {
                    tooltipText = response.shortMessage || ERROR_MESSAGES.QUOTA_EXCEEDED_SHORT
                    errorMessage = response.error // Keep detailed message for modal
                } else if (response.errorType === "TranslationError") {
                    errorMessage = response.error
                }

                translationDisplay.updateTranslationResult(
                    anchorId,
                    {
                        status: "error",
                        text: tooltipText,
                        errorMessage: errorMessage,
                    },
                    displaySettings
                )
                logger.error("Fragment translation error:", response.error)
            }
        } catch (error) {
            translationDisplay.updateTranslationResult(
                anchorId,
                {
                    status: "error",
                    text: "翻译失败",
                    errorMessage: ERROR_MESSAGES.SERVER_BUSY,
                },
                displaySettings
            )
            logger.error("Fragment translation request failed:", error)
        }
    }

    // Detect overlapping translations BEFORE wrapping (collect IDs only)
    const preWrapOverlappingIds = translationOverlapDetector.detectOverlappingTranslations(range)

    // Show loading state with full context and refresh callback (this wraps the selection)
    const refreshCallback = async () => {
        logger.info("[Fragment Path] Refreshing translation for:", fragment)
        await performFragmentRequest(true)
    }
    anchorId = translationDisplay.showTranslationResult(
        range,
        fragment,
        {
            status: "loading",
            text: i18nModule.translate("modal.loading"),
            loadingVariant,
        },
        context,
        refreshCallback,
        "fragment", // Specify this is a fragment translation
        displaySettings
    )

    // After wrapping, remove ALL instances of pre-detected overlapping anchors by ID
    // This handles cases where a previous anchor was split and duplicated (nested clone + leftover)
    try {
        const toRemove = preWrapOverlappingIds.filter((id) => id !== anchorId)
        if (toRemove.length > 0) {
            logger.info("[Fragment Path] Removing overlapping translations after wrap:", toRemove)
            toRemove.forEach((id) => {
                while (document.getElementById(id)) {
                    translationDisplay.removeTranslationResult(id)
                }
            })
        }
    } catch (e) {
        logger.warn("[Fragment Path] Overlap cleanup after wrap failed:", e)
    }

    // Begin async language detection and then request translation
    await performFragmentRequest()
}
