import { APP_EDITION } from "@/0_common/constants"
import * as i18nModule from "@/0_common/utils/i18n"
import * as loggerModule from "@/0_common/utils/logger"
import * as settingsManagerModule from "@/4_options/modules/settingsManager"
import type * as types from "@/0_common/types"
import * as storageManagerModule from "@/0_common/utils/storageManager"
import * as translationFontSizeModule from "@/0_common/constants/translationFontSize"

const logger = loggerModule.createLogger("Options")
const DEFAULT_DOCUMENTATION_URL = "https://tapword.ai"

const PREVIEW_ORIGINAL_FONT_PX = 16
const PREVIEW_ORIGINAL_LINE_HEIGHT_PX = 20
const PREVIEW_UI_SPACING_PX = 3
const PREVIEW_MAX_FONT_RATIO = 0.8
const PREVIEW_SAFETY_DELTA_PX = 1

function readFiniteNumber(value: string, fallback: number): number {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
        return fallback
    }
    return parsed
}

function computePreviewTooltipFontPx(minFontPx: number, nextLineGapPx: number): { tooltipFontPx: number; requiredLineHeightPx: number } {
    const lineSpacing = PREVIEW_ORIGINAL_LINE_HEIGHT_PX - PREVIEW_ORIGINAL_FONT_PX
    const availableSpace = lineSpacing - PREVIEW_UI_SPACING_PX
    const maxFontPx = PREVIEW_ORIGINAL_FONT_PX * PREVIEW_MAX_FONT_RATIO
    const effectiveAvailable = Math.max(availableSpace - PREVIEW_SAFETY_DELTA_PX - nextLineGapPx, 0)

    let tooltipFontPx = Math.min(effectiveAvailable, maxFontPx)
    tooltipFontPx = Math.max(tooltipFontPx, minFontPx)

    const targetAvailable = Math.max(minFontPx + PREVIEW_SAFETY_DELTA_PX + nextLineGapPx, 0)
    const increase = Math.max(targetAvailable - availableSpace, 0)
    const requiredLineHeightPx = PREVIEW_ORIGINAL_LINE_HEIGHT_PX + increase

    return { tooltipFontPx, requiredLineHeightPx }
}

function applyCommunityUiOverrides(): void {
    if (APP_EDITION !== "community") {
        const autoPlayNote = document.getElementById("autoPlayAudioCommunityNote")
        autoPlayNote?.remove()
        return
    }

    // Show community edition subtitle
    const communitySubtitle = document.getElementById("communitySubtitle")
    if (communitySubtitle) {
        communitySubtitle.style.display = "inline"
    }

    const customApiHelper = document.querySelector('[data-i18n-key="popup.section.customApi.helper"]')
    customApiHelper?.setAttribute("data-i18n-key", "popup.section.customApi.helper.community")

    const autoPlayToggle = document.getElementById("autoPlayAudio") as HTMLInputElement | null
    const autoPlayItem = document.getElementById("autoPlayAudioSettingItem")
    const autoPlayNote = document.getElementById("autoPlayAudioCommunityNote")

    if (autoPlayToggle) {
        autoPlayToggle.checked = false
        autoPlayToggle.disabled = true
    }

    autoPlayItem?.classList.add("is-disabled")

    if (autoPlayNote) {
        autoPlayNote.setAttribute("data-i18n-key", "popup.autoPlayAudio.communityNote")
        autoPlayNote.textContent = i18nModule.translate("popup.autoPlayAudio.communityNote")
        autoPlayNote.classList.add("is-disabled")
    }
}

function positionPreviewTooltip(stage: HTMLElement, anchor: HTMLElement, tooltip: HTMLElement, verticalOffsetPx: number): void {
    const stageRect = stage.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()

    const top = anchorRect.bottom - stageRect.top + verticalOffsetPx
    const tooltipWidth = tooltip.offsetWidth || 0

    const idealLeft = anchorRect.left - stageRect.left + (anchorRect.width - tooltipWidth) / 2
    const pad = 8
    const maxLeft = Math.max(pad, stageRect.width - tooltipWidth - pad)
    const left = Math.max(pad, Math.min(idealLeft, maxLeft))

    tooltip.style.top = `${top}px`
    tooltip.style.left = `${left}px`
}

async function setupTooltipSpacingPreview(): Promise<void> {
    const stage = document.getElementById("tooltipPreviewStage")
    const paragraph = document.getElementById("tooltipPreviewParagraph")
    const anchor1 = document.getElementById("tooltipPreviewAnchor1")
    const anchor = document.getElementById("tooltipPreviewAnchor")
    const tooltip1 = document.getElementById("tooltipPreviewTooltip1")
    const tooltip = document.getElementById("tooltipPreviewTooltip")

    const gapInput = document.getElementById("tooltipNextLineGapPx") as HTMLInputElement | null
    const offsetInput = document.getElementById("tooltipVerticalOffsetPx") as HTMLInputElement | null
    const gapWarning = document.getElementById("tooltipNextLineGapPxWarning")
    const offsetWarning = document.getElementById("tooltipVerticalOffsetPxWarning")
    const fontPresetSelect = document.getElementById("translationFontSizePreset") as HTMLSelectElement | null
    const autoAdjustHeightInput = document.getElementById("autoAdjustHeight") as HTMLInputElement | null

    if (
        !stage ||
        !paragraph ||
        !anchor1 ||
        !anchor ||
        !tooltip1 ||
        !tooltip ||
        !gapInput ||
        !offsetInput ||
        !fontPresetSelect ||
        !autoAdjustHeightInput
    ) {
        return
    }

    const settings = await storageManagerModule.getUserSettings()
    if (!gapInput.value) {
        gapInput.value = String(settings.tooltipNextLineGapPx)
    }
    if (!offsetInput.value) {
        offsetInput.value = String(settings.tooltipVerticalOffsetPx)
    }

    let didLogInvisibleOnce = false

    const isElementMeasurable = (element: HTMLElement): boolean => {
        if (!element.isConnected) {
            return false
        }
        if (element.offsetParent === null) {
            return false
        }
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
    }

    const schedulePosition = (verticalOffsetPx: number): void => {
        requestAnimationFrame(() => {
            const stageOk = isElementMeasurable(stage)
            const anchor1Ok = isElementMeasurable(anchor1)
            const anchorOk = isElementMeasurable(anchor)

            if (!stageOk || !anchor1Ok || !anchorOk) {
                if (!didLogInvisibleOnce) {
                    const stageRect = stage.getBoundingClientRect()
                    const anchor1Rect = anchor1.getBoundingClientRect()
                    const anchorRect = anchor.getBoundingClientRect()
                    logger.debug("Tooltip preview skipped positioning (elements not measurable)", {
                        stage: { width: stageRect.width, height: stageRect.height, top: stageRect.top, left: stageRect.left },
                        anchor1: { width: anchor1Rect.width, height: anchor1Rect.height, top: anchor1Rect.top, left: anchor1Rect.left },
                        anchor: { width: anchorRect.width, height: anchorRect.height, top: anchorRect.top, left: anchorRect.left },
                    })
                    didLogInvisibleOnce = true
                }
                return
            }

            didLogInvisibleOnce = false
            positionPreviewTooltip(stage, anchor1, tooltip1, verticalOffsetPx)
            positionPreviewTooltip(stage, anchor, tooltip, verticalOffsetPx)
        })
    }

    const updatePreview = () => {
        let nextLineGapPx = readFiniteNumber(gapInput.value, settings.tooltipNextLineGapPx)
        let verticalOffsetPx = readFiniteNumber(offsetInput.value, settings.tooltipVerticalOffsetPx)

        // Show warning if values are out of range
        const gapOutOfRange = nextLineGapPx < 0 || nextLineGapPx > 20
        const offsetOutOfRange = verticalOffsetPx < 0 || verticalOffsetPx > 20

        if (gapWarning) {
            gapWarning.classList.toggle("show", gapOutOfRange)
        }
        if (offsetWarning) {
            offsetWarning.classList.toggle("show", offsetOutOfRange)
        }

        // Clamp values to valid range [0, 20]
        nextLineGapPx = Math.max(0, Math.min(20, nextLineGapPx))
        verticalOffsetPx = Math.max(0, Math.min(20, verticalOffsetPx))

        const autoAdjustHeight = autoAdjustHeightInput.checked

        const resolved = translationFontSizeModule.resolveTranslationFontSize(fontPresetSelect.value as types.TranslationFontSizePreset)

        paragraph.style.fontSize = `${PREVIEW_ORIGINAL_FONT_PX}px`

        const { tooltipFontPx, requiredLineHeightPx } = computePreviewTooltipFontPx(resolved.px, nextLineGapPx)

        paragraph.style.lineHeight = autoAdjustHeight ? `${requiredLineHeightPx}px` : `${PREVIEW_ORIGINAL_LINE_HEIGHT_PX}px`
        tooltip1.style.fontSize = `${tooltipFontPx}px`
        tooltip.style.fontSize = `${tooltipFontPx}px`

        // Force reflow to ensure tooltip dimensions are calculated before positioning
        void tooltip1.offsetWidth
        void tooltip.offsetWidth

        schedulePosition(verticalOffsetPx)
    }

    gapInput.addEventListener("input", updatePreview)
    offsetInput.addEventListener("input", updatePreview)
    fontPresetSelect.addEventListener("change", updatePreview)
    autoAdjustHeightInput.addEventListener("change", updatePreview)
    window.addEventListener("resize", updatePreview)

    const owningSection = stage.closest<HTMLElement>(".settings-section")
    if (owningSection) {
        const observer = new MutationObserver(() => {
            updatePreview()
        })
        observer.observe(owningSection, { attributes: true, attributeFilter: ["class", "style"] })
    }

    // Ensure correct placement after fonts finish loading (if any web fonts exist).
    document.fonts?.ready.then(() => updatePreview()).catch(() => {})

    updatePreview()
}

async function fetchWebsiteUrl(): Promise<string | null> {
    try {
        const request: types.PopupBootstrapRequestMessage = { type: "POPUP_BOOTSTRAP_REQUEST" }

        const response = await new Promise<types.PopupBootstrapResponseMessage | null>((resolve) => {
            chrome.runtime.sendMessage(request, (message) => {
                resolve((message ?? null) as types.PopupBootstrapResponseMessage | null)
            })
        })

        if (!response || response.type !== "POPUP_BOOTSTRAP_RESPONSE" || !response.success) {
            return null
        }

        const websiteUrl = response.data.websiteUrl
        return websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
    } catch (error) {
        logger.warn("Failed to fetch website url", error)
        return null
    }
}

function setupNavigation(): void {
    const navItems = document.querySelectorAll<HTMLElement>(".nav-item")
    const sections = document.querySelectorAll<HTMLElement>(".settings-section")

    navItems.forEach((item) => {
        item.addEventListener("click", (event) => {
            event.preventDefault()

            navItems.forEach((nav) => nav.classList.remove("active"))
            item.classList.add("active")

            const sectionId = item.getAttribute("data-section")
            sections.forEach((section) => {
                if (section.id === sectionId) {
                    section.classList.add("active")
                } else {
                    section.classList.remove("active")
                }
            })
        })
    })
}

function setupDocumentationButton(websiteUrl: string | null): void {
    const docsButton = document.getElementById("documentationButton") as HTMLButtonElement | null

    if (!docsButton) {
        return
    }

    docsButton.addEventListener("click", () => {
        const targetUrl = websiteUrl ?? DEFAULT_DOCUMENTATION_URL

        try {
            chrome.tabs.create({ url: targetUrl })
        } catch (error) {
            logger.warn("Failed to open documentation via chrome.tabs, falling back to window.open", error)
            window.open(targetUrl, "_blank", "noopener,noreferrer")
        }
    })
}

function setVersion(): void {
    const versionDisplay = document.getElementById("versionDisplay")
    if (!versionDisplay) {
        return
    }

    const version = chrome.runtime.getManifest().version
    versionDisplay.textContent = version
}

async function initializeOptions(): Promise<void> {
    logger.info("Options initializing")

    try {
        i18nModule.initI18n()
        applyCommunityUiOverrides()
        i18nModule.applyTranslations()

        await settingsManagerModule.loadSettings()
        settingsManagerModule.setupSettingChangeListeners()
        settingsManagerModule.setupCustomApiValidation()
        await setupTooltipSpacingPreview()

        const websiteUrl = await fetchWebsiteUrl()

        setVersion()
        setupNavigation()
        setupDocumentationButton(websiteUrl)

        logger.info("Options initialized")
    } finally {
        document.documentElement.classList.remove("loading")
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initializeOptions().catch((error) => {
        logger.error("Failed to initialize options:", error)
    })
})
