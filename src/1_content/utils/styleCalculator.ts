/**
 * Tooltip Style Calculator
 *
 * Calculates the optimal font size and color for the translation tooltip
 * based on the styles of the original selected text element.
 */
import * as types from "@/0_common/types"
import * as loggerModule from "@/0_common/utils/logger"
import * as contentConstants from "@/1_content/constants"
import * as contentIndex from "@/1_content/index"

const logger = loggerModule.createLogger("styleCalculator")

// ============================================================================
// Color Manipulation
// ============================================================================

/**
 * Parses a CSS color string (rgb, rgba, or hex) into an RGBA object.
 * @param colorString - The CSS color string.
 * @returns An object with r, g, b, a properties, or null if parsing fails.
 */
function parseColor(colorString: string): { r: number; g: number; b: number; a: number } | null {
    if (!colorString) return null

    // RGB or RGBA
    const rgbaMatch = colorString.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/)
    if (rgbaMatch) {
        return {
            r: parseInt(rgbaMatch[1] ?? "0", 10),
            g: parseInt(rgbaMatch[2] ?? "0", 10),
            b: parseInt(rgbaMatch[3] ?? "0", 10),
            a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
        }
    }

    // Hex (e.g., #abc, #abcdef)
    const hexMatch = colorString.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
    if (hexMatch) {
        return {
            r: parseInt(hexMatch[1] ?? "00", 16),
            g: parseInt(hexMatch[2] ?? "00", 16),
            b: parseInt(hexMatch[3] ?? "00", 16),
            a: 1,
        }
    }
    const shortHexMatch = colorString.match(/^#?([a-f\d])([a-f\d])([a-f\d])$/i)
    if (shortHexMatch) {
        const r = shortHexMatch[1] ?? "0"
        const g = shortHexMatch[2] ?? "0"
        const b = shortHexMatch[3] ?? "0"
        return {
            r: parseInt(r + r, 16),
            g: parseInt(g + g, 16),
            b: parseInt(b + b, 16),
            a: 1,
        }
    }

    return null
}

/**
 * Lightens a color by a given amount and sets its alpha transparency.
 *
 * @param colorString - The initial CSS color string (e.g., 'rgb(255, 0, 0)', '#ff0000').
 * @param lightenAmount - A value between 0 and 1 to control lightness (0 = no change, 1 = white).
 * @param alpha - The desired alpha transparency (0 to 1).
 * @returns A new rgba color string, or the original color if parsing fails.
 */
function lightenColor(colorString: string, lightenAmount: number, alpha: number): string {
    const color = parseColor(colorString)
    if (!color) {
        return colorString // Return original if parsing fails
    }

    // Clamp lightenAmount and alpha to be between 0 and 1
    const lightAmount = Math.max(0, Math.min(1, lightenAmount))
    const finalAlpha = Math.max(0, Math.min(1, alpha))

    // Calculate the new color by interpolating towards white
    const r = Math.round(color.r + (255 - color.r) * lightAmount)
    const g = Math.round(color.g + (255 - color.g) * lightAmount)
    const b = Math.round(color.b + (255 - color.b) * lightAmount)

    return `rgba(${r}, ${g}, ${b}, ${finalAlpha})`
}

// ============================================================================
// Font Size Calculation
// ============================================================================

// Constants
const UI_SPACING_PX = 3
const MAX_FONT_RATIO = 0.8
const LAST_LINE_EPSILON_PX = 1.5

function isHeadingElement(el: HTMLElement | null): boolean {
    if (!el) return false
    const tag = el.tagName?.toUpperCase()
    return tag === "H1" || tag === "H2" || tag === "H3" || tag === "H4" || tag === "H5" || tag === "H6"
}

function isSelectionOnLastLine(anchor: HTMLElement | null, container: HTMLElement | null): boolean {
    if (!anchor || !container) return false
    const rects = anchor.getClientRects()
    if (!rects || rects.length === 0) return false
    const lastRect = rects[rects.length - 1] as DOMRect | ClientRect | undefined
    if (!lastRect) return false
    const containerBottom = container.getBoundingClientRect().bottom
    const delta = containerBottom - lastRect.bottom
    return delta <= LAST_LINE_EPSILON_PX
}

/**
 * Calculate optimal translation font size based on available line spacing.
 * Returns both the font size and detailed calculation information.
 */
function calculateOptimalTranslationFontSize(
    originalElement: HTMLElement | null,
    originalFontSize: number,
    anchor?: HTMLElement | null,
    minFontSizeOverride?: number
): { fontSize: number; spaceCalculation: SpaceCalculation } {
    logger.info(`Calculating font size. Original: ${originalFontSize}px`, originalElement)

    const cachedSettings = contentIndex.getCachedUserSettings()
    const minFontSize = minFontSizeOverride ?? contentConstants.MIN_TOOLTIP_FONT_PX
    const desiredGap = cachedSettings?.tooltipNextLineGapPxV2 ?? types.DEFAULT_USER_SETTINGS.tooltipNextLineGapPxV2

    if (!originalElement) {
        const fallbackSize = originalFontSize * 0.7
        const maxFontSize = originalFontSize * MAX_FONT_RATIO
        const safetyDelta = contentConstants.MIN_TOOLTIP_SAFETY_DELTA_PX
        const adjustedFallback = Math.max(fallbackSize - safetyDelta - desiredGap, 0)
        const computedFontSize = Math.max(Math.min(adjustedFallback, maxFontSize), minFontSize)

        logger.info(
            `No original element. Fallback font: ${computedFontSize.toFixed(2)}px (base=${fallbackSize.toFixed(2)}px, safetyDelta=${safetyDelta})`
        )

        return {
            fontSize: computedFontSize,
            spaceCalculation: {
                originalFontSize,
                lineHeight: originalFontSize * 1.2,
                lineSpacing: originalFontSize * 0.2,
                availableSpace: fallbackSize,
                requiredFontSize: computedFontSize,
                minFontSize,
                maxFontSize,
            },
        }
    }

    const computedStyle = window.getComputedStyle(originalElement)
    let lineHeight = parseFloat(computedStyle.lineHeight)

    // Handle line-height: normal (not a number)
    if (isNaN(lineHeight)) {
        // Default browser behavior: normal is approximately 1.2 times font size
        lineHeight = originalFontSize * 1.2
    }

    // Calculate available line spacing
    const lineSpacing = lineHeight - originalFontSize

    // Internal space under the line (body text friendly)
    const internalAvailable = lineSpacing - UI_SPACING_PX

    // Heading optimization: if anchor is on the last line of a heading, prefer margin-bottom
    let availableSpace = internalAvailable
    const heading = isHeadingElement(originalElement)
    const onLastLine = isSelectionOnLastLine(anchor || null, originalElement)
    if (heading && onLastLine) {
        const mb = parseFloat(computedStyle.marginBottom)
        const marginAvailable = (isNaN(mb) ? 0 : mb) - UI_SPACING_PX
        if (marginAvailable > 0) {
            logger.info(`Heading on last line detected. Using margin-bottom for available space: ${marginAvailable}px`)
            availableSpace = marginAvailable
        }
    }

    // Constraints
    const maxFontSize = originalFontSize * MAX_FONT_RATIO

    // Apply safety delta so tooltip font is slightly smaller than available space
    const safetyDelta = contentConstants.MIN_TOOLTIP_SAFETY_DELTA_PX
    const effectiveAvailable = Math.max(availableSpace - safetyDelta - desiredGap, 0)

    // Calculate optimal font size using effective available space
    let translationFontSize = Math.min(effectiveAvailable, maxFontSize)
    translationFontSize = Math.max(translationFontSize, minFontSize)

    const spaceCalculation: SpaceCalculation = {
        originalFontSize,
        lineHeight,
        lineSpacing,
        availableSpace,
        requiredFontSize: translationFontSize,
        minFontSize,
        maxFontSize,
    }

    logger.info(
        `Font size calculation complete. ` +
            `Result: ${translationFontSize.toFixed(2)}px. ` +
            `Details: original=${originalFontSize.toFixed(2)}px, ` +
            `lineHeight=${lineHeight.toFixed(2)}px, ` +
            `lineSpacing=${lineSpacing.toFixed(2)}px, ` +
            `availableSpace=${availableSpace.toFixed(2)}px, ` +
            `effectiveAvailable=${effectiveAvailable.toFixed(2)}px, safetyDelta=${safetyDelta}, ` +
            `constraints(min=${minFontSize}, max=${maxFontSize.toFixed(2)})`
    )

    return { fontSize: translationFontSize, spaceCalculation }
}

// ============================================================================
// Composite Style Calculation
// ============================================================================

/**
 * Detailed space calculation information for line-height adjustment
 */
export interface SpaceCalculation {
    originalFontSize: number
    lineHeight: number
    lineSpacing: number
    availableSpace: number
    requiredFontSize: number
    minFontSize: number
    maxFontSize: number
}

/**
 * Tooltip style result including font size, color, and space calculation
 */
export interface TooltipStyle {
    fontSize: number
    color: string
    spaceCalculation?: SpaceCalculation
}

/**
 * Calculates the complete style (font size and color) for the tooltip.
 * @param originalElement - The parent element of the selected text.
 * @param anchor - The anchor element (the wrapped translated text).
 * @param fallbackFontSize - A fallback font size if it cannot be determined.
 * @param minFontSize - Optional minimum font size for translation (user setting).
 * @returns An object with `fontSize`, `color`, and `spaceCalculation` properties.
 */
export function calculateTooltipStyle(
    originalElement: HTMLElement | null,
    anchor?: HTMLElement | null,
    fallbackFontSize = 16,
    minFontSize?: number
): TooltipStyle {
    const computedStyle = originalElement ? window.getComputedStyle(originalElement) : null
    const originalFontSize = computedStyle ? parseFloat(computedStyle.fontSize) : fallbackFontSize
    const originalColor = computedStyle ? computedStyle.color : "rgb(0, 0, 0)"

    const result = calculateOptimalTranslationFontSize(originalElement, originalFontSize, anchor, minFontSize)
    const color = lightenColor(originalColor, 0.02, 0.98) // 10% lighter, 90% alpha

    return {
        fontSize: result.fontSize,
        color,
        spaceCalculation: result.spaceCalculation,
    }
}
