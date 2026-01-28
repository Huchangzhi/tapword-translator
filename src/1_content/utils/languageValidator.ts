/**
 * Language Validator Utility
 *
 * Validates text content against target language settings to determine if translation is necessary.
 * Handles "Native Speaker Suppression" logic.
 */
import * as loggerModule from "@/0_common/utils/logger"
import { detectSourceLanguageAsync } from "@/1_content/utils/languageDetector"

const logger = loggerModule.createLogger("languageValidator")

const CHINESE_RATIO_THRESHOLD = 0.05

// Script Regexes
const REGEX_KANA = /[\p{Script=Hiragana}\p{Script=Katakana}]/u
const REGEX_HANGUL = /\p{Script=Hangul}/u
const REGEX_CYRILLIC = /\p{Script=Cyrillic}/u
const REGEX_HAN = /\p{Script=Han}/gu

/**
 * Determines whether to trigger translation (show icon or immediate translate) based on text content and target language.
 *
 * Logic:
 * - If text matches the target language's native script, we assume the user is a native speaker reading their own language
 *   and does not need translation.
 * - For Chinese ('zh'), we use a ratio check because Han characters are shared with Japanese.
 * - For Japanese ('ja'), we check for Kana (Hiragana/Katakana) which are unique to Japanese.
 * - For Korean ('ko') and Russian ('ru'), we check for their specific scripts.
 * - For other languages (e.g., 'es', 'fr'), we use async language detection on the context text.
 *   If the detected language matches the target, we suppress translation.
 *
 * @param text - The selected text
 * @param targetLanguage - The user's target language setting
 * @param contextText - Surrounding text context for more accurate language detection (optional but recommended for non-script-based languages)
 * @returns true if translation should be triggered, false if it should be suppressed
 */
export async function shouldTriggerTranslationAsync(text: string, targetLanguage: string, contextText?: string): Promise<boolean> {
    const tgtLang = (targetLanguage || "").toLowerCase().split("-")[0] // Normalize 'zh-CN' -> 'zh'

    switch (tgtLang) {
        case "zh": {
            // 1. Check if the selection ITSELF is Chinese
            // Check for Han characters ratio, but allow if Japanese Kana is present
            if (REGEX_KANA.test(text)) {
                return true // It's likely Japanese, so show translation for Chinese user
            }
            // Count Han characters
            const chineseMatches = text.match(REGEX_HAN)
            const chineseCount = chineseMatches ? chineseMatches.length : 0
            const totalLength = text.length

            // If strict majority or significant ratio (e.g. > 20%) are Chinese characters, suppress icon
            if (totalLength > 0 && chineseCount / totalLength > CHINESE_RATIO_THRESHOLD) {
                logger.debug("Suppressing translation: Target is Chinese and text is identified as Chinese", {
                    text: text.substring(0, 20) + "...",
                    ratio: chineseCount / totalLength,
                })
                return false
            }

            // 2. Check if the CONTEXT is Chinese
            // This handles cases like selecting "iPhone" (English) inside a Chinese paragraph.
            if (contextText && contextText.trim().length > 0) {
                const contextLang = await detectSourceLanguageAsync(contextText)
                if (contextLang === "zh") {
                    logger.debug("Suppressing translation: Target is Chinese and context detected as Chinese", {
                        contextSnippet: contextText.substring(0, 20) + "...",
                    })
                    return false
                }
            }

            return true
        }
        case "ja": {
            // Japanese: Suppress if text contains Kana (unique to Japanese)
            if (REGEX_KANA.test(text)) {
                logger.debug("Suppressing translation: Target is Japanese and text contains Kana")
                return false
            }
            return true
        }
        case "ko": {
            // Korean: Suppress if text contains Hangul
            if (REGEX_HANGUL.test(text)) {
                logger.debug("Suppressing translation: Target is Korean and text contains Hangul")
                return false
            }
            return true
        }
        case "ru": {
            // Russian: Suppress if text contains Cyrillic
            if (REGEX_CYRILLIC.test(text)) {
                logger.debug("Suppressing translation: Target is Russian and text contains Cyrillic")
                return false
            }
            return true
        }
        case "en": {
            // English: Do not suppress (as requested)
            return true
        }
        default: {
            // Other languages (es, fr, de, etc.)
            // Rely on async language detection if context is provided
            if (contextText && contextText.length > 0) {
                const detectedLang = await detectSourceLanguageAsync(contextText)
                if (detectedLang === tgtLang) {
                    logger.debug(`Suppressing translation: Target is ${tgtLang} and context detected as ${detectedLang}`)
                    return false
                }
            }
            return true
        }
    }
}
