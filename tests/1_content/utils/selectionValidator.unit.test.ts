import { validateSelectionAsync } from "@/1_content/utils/selectionValidator"
import { describe, expect, it, vi } from "vitest"
import { DEFAULT_USER_SETTINGS } from "@/0_common/types"

// Mock global Node constants
// vi.stubGlobal("Node", { ELEMENT_NODE: 1 }) // Removed

// Mock DOM dependencies
const mockSelection = (text: string, rangeCount = 1) => ({
    rangeCount,
    getRangeAt: () => ({
        commonAncestorContainer: {
            nodeType: 1, // ELEMENT_NODE
            parentElement: null,
            closest: () => null,
            textContent: text,
        },
        cloneContents: () => ({
            textContent: text
        }),
        toString: () => text
    })
}) as unknown as Selection

// Mock dependencies
vi.mock("@/1_content/utils/domSanitizer", () => ({
    getCleanTextFromRange: (range: any) => range.toString(),
    getSurroundingTextForDetection: () => "some context"
}))
vi.mock("@/1_content/utils/editableElementDetector", () => ({
    isEditableElement: () => false
}))

describe("validateSelectionAsync", () => {
    const settings = { ...DEFAULT_USER_SETTINGS }

    it("returns invalid for null selection", async () => {
        const result = await validateSelectionAsync(null, settings, "icon")
        expect(result.isValid).toBe(false)
        expect(result.reason).toBe("No valid selection")
    })

    it("returns invalid for empty selection", async () => {
        const result = await validateSelectionAsync(mockSelection(""), settings, "icon")
        expect(result.isValid).toBe(false)
        expect(result.reason).toBe("Empty selection")
    })

    it("returns invalid if enableTapWord is false", async () => {
        const disabledSettings = { ...settings, enableTapWord: false }
        const result = await validateSelectionAsync(mockSelection("test"), disabledSettings, "icon")
        expect(result.isValid).toBe(false)
        expect(result.reason).toContain("disabled via enableTapWord")
    })

    it("returns invalid if showIcon is false for icon trigger", async () => {
        const noIconSettings = { ...settings, showIcon: false }
        const result = await validateSelectionAsync(mockSelection("test"), noIconSettings, "icon")
        expect(result.isValid).toBe(false)
        expect(result.reason).toContain("Icon disabled")
        expect(result.shouldCleanup).toBe(false)
    })

    it("returns valid if showIcon is false but trigger is doubleClick", async () => {
        const noIconSettings = { ...settings, showIcon: false }
        const result = await validateSelectionAsync(mockSelection("test"), noIconSettings, "doubleClick")
        expect(result.isValid).toBe(true)
    })

    it("returns invalid for numeric selection on doubleClick", async () => {
        const result = await validateSelectionAsync(mockSelection("12345"), settings, "doubleClick")
        expect(result.isValid).toBe(false)
        expect(result.reason).toContain("Contentless selection")
    })

    it("returns invalid for numeric selection on icon trigger", async () => {
        const result = await validateSelectionAsync(mockSelection("12345"), settings, "icon")
        expect(result.isValid).toBe(false)
        expect(result.reason).toContain("Contentless selection")
    })

    it("returns invalid for punctuation-only selection", async () => {
        const result = await validateSelectionAsync(mockSelection("..."), settings, "icon")
        expect(result.isValid).toBe(false)
        expect(result.reason).toContain("Contentless selection")
    })

    it("returns invalid for symbol-only selection", async () => {
        const result = await validateSelectionAsync(mockSelection("$%^"), settings, "icon")
        expect(result.isValid).toBe(false)
        expect(result.reason).toContain("Contentless selection")
    })

    it("returns invalid for mixed numeric/symbol selection", async () => {
        const result = await validateSelectionAsync(mockSelection("$123.45"), settings, "icon")
        expect(result.isValid).toBe(false)
        expect(result.reason).toContain("Contentless selection")
    })
    
    it("returns invalid when suppressed by language detector (integration check)", async () => {
        // Target Chinese, Text Chinese -> Should suppress
        const zhSettings = { ...settings, targetLanguage: "zh" }
        const result = await validateSelectionAsync(mockSelection("你好世界"), zhSettings, "icon")
        expect(result.isValid).toBe(false)
        expect(result.reason).toContain("Suppressed by language detector")
    })
})