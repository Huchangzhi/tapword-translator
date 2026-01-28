import { shouldTriggerTranslationAsync } from "@/1_content/utils/languageValidator"
import { describe, expect, it, vi } from "vitest"

// Mock languageDetector
vi.mock("@/1_content/utils/languageDetector", () => ({
    detectSourceLanguageAsync: vi.fn()
}))
import { detectSourceLanguageAsync } from "@/1_content/utils/languageDetector"

describe("shouldTriggerTranslationAsync", () => {
    it("returns true when target language is not Chinese", async () => {
        expect(await shouldTriggerTranslationAsync("有些中文", "en")).toBe(true)
    })

    it("returns true when target is Chinese but text is not Chinese", async () => {
        expect(await shouldTriggerTranslationAsync("Hello world", "zh")).toBe(true)
        expect(await shouldTriggerTranslationAsync("123456", "zh")).toBe(true)
    })

    it("returns false when target is Chinese and text is Chinese", async () => {
        expect(await shouldTriggerTranslationAsync("你好世界", "zh")).toBe(false)
        expect(await shouldTriggerTranslationAsync("这是一段测试文本", "zh-CN")).toBe(false)
    })

    it("returns true when Japanese kana is present in Chinese target", async () => {
        expect(await shouldTriggerTranslationAsync("こんにちは", "zh")).toBe(true)
        expect(await shouldTriggerTranslationAsync("カタカナ", "zh")).toBe(true)
        expect(await shouldTriggerTranslationAsync("日本語のテスト", "zh")).toBe(true)
    })

    it("handles mixed content based on ratio (threshold 0.2)", async () => {
        // Mostly Chinese -> Suppress
        expect(await shouldTriggerTranslationAsync("你好ab", "zh")).toBe(false)
        // Mostly English -> Show
        // 1/6 = 0.166 < 0.2 -> Should return true
        expect(await shouldTriggerTranslationAsync("你abcde", "zh")).toBe(true)
    })

    it("suppresses English selection if context is Chinese (Target: zh)", async () => {
        vi.mocked(detectSourceLanguageAsync).mockResolvedValue("zh")
        // "iPhone" is English, but context is Chinese
        expect(await shouldTriggerTranslationAsync("iPhone", "zh", "我们正在讨论 iPhone 15 Pro 的新功能")).toBe(false)
    })

    it("shows English selection if context is English (Target: zh)", async () => {
        vi.mocked(detectSourceLanguageAsync).mockResolvedValue("en")
        // "iPhone" is English, context is English
        expect(await shouldTriggerTranslationAsync("iPhone", "zh", "We are discussing iPhone 15 Pro")).toBe(true)
    })

    it("handles empty strings safely", async () => {
        expect(await shouldTriggerTranslationAsync("", "zh")).toBe(true)
    })

    describe("Language Specific Suppression", () => {
        it("suppresses Japanese text (Kana) when target is Japanese", async () => {
            expect(await shouldTriggerTranslationAsync("こんにちは", "ja")).toBe(false)
            expect(await shouldTriggerTranslationAsync("日本語のテスト", "ja")).toBe(false)
        })

        it("shows pure Kanji text when target is Japanese", async () => {
            expect(await shouldTriggerTranslationAsync("学生", "ja")).toBe(true)
        })

        it("shows non-Japanese text when target is Japanese", async () => {
            expect(await shouldTriggerTranslationAsync("Hello", "ja")).toBe(true)
        })

        it("suppresses Korean text (Hangul) when target is Korean", async () => {
            expect(await shouldTriggerTranslationAsync("안녕하세요", "ko")).toBe(false)
            expect(await shouldTriggerTranslationAsync("한국어", "ko")).toBe(false)
        })

        it("shows non-Korean text when target is Korean", async () => {
            expect(await shouldTriggerTranslationAsync("Hello", "ko")).toBe(true)
        })

        it("suppresses Russian text (Cyrillic) when target is Russian", async () => {
            expect(await shouldTriggerTranslationAsync("Привет", "ru")).toBe(false)
            expect(await shouldTriggerTranslationAsync("Русский", "ru")).toBe(false)
        })

        it("shows non-Russian text when target is Russian", async () => {
            expect(await shouldTriggerTranslationAsync("Hello", "ru")).toBe(true)
        })
    })

    describe("Async Context Detection (Generic Languages)", () => {
        it("always returns true for English target regardless of context", async () => {
            expect(await shouldTriggerTranslationAsync("Hola", "en")).toBe(true)
        })

        it("suppresses when context language matches target language (e.g., Spanish)", async () => {
            vi.mocked(detectSourceLanguageAsync).mockResolvedValue("es")
            // Context matches target 'es' -> Suppress
            expect(await shouldTriggerTranslationAsync("Hola", "es", "Hola mundo esta es una prueba")).toBe(false)
        })

        it("shows translation when context language differs from target (e.g., Spanish)", async () => {
            vi.mocked(detectSourceLanguageAsync).mockResolvedValue("en")
            // Context 'en' != Target 'es' -> Show
            expect(await shouldTriggerTranslationAsync("Hello", "es", "Hello world this is a test")).toBe(true)
        })

        it("shows translation if no context is provided for generic languages", async () => {
            // No context provided -> default to true
            expect(await shouldTriggerTranslationAsync("Hola", "es")).toBe(true)
        })
    })
})
