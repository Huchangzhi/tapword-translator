/**
 * UI Internationalization (i18n) Utility
 *
 * Provides runtime translation for UI elements in the extension.
 * This handles both popup and content script UI translations.
 *
 * Key features:
 * 1. Load translations from locale JSON files
 * 2. Auto-detect user's browser language
 * 3. Apply translations to DOM elements with data-i18n-key attribute
 * 4. Fallback to English if translation not found
 *
 * Usage:
 * 1. Add data-i18n-key="key.name" to HTML elements
 * 2. For attributes: data-i18n-key="key.name" data-i18n-attr="title"
 * 3. Call applyTranslations() or use t() for programmatic access
 */

import * as loggerModule from "@/0_common/utils/logger"

// Import all locale files
import deLocale from "@/0_common/locales/de.json"
import enLocale from "@/0_common/locales/en.json"
import esLocale from "@/0_common/locales/es.json"
import frLocale from "@/0_common/locales/fr.json"
import jaLocale from "@/0_common/locales/ja.json"
import koLocale from "@/0_common/locales/ko.json"
import ruLocale from "@/0_common/locales/ru.json"
import zhLocale from "@/0_common/locales/zh.json"

const logger = loggerModule.createLogger("i18n")
const SCRIPT_TAG_REGEX = /<\s*script\b/i
const HTML_EVENT_HANDLER_REGEX = /\son\w+\s*=/i
const JAVASCRIPT_URL_REGEX = /javascript\s*:/i

// Type definitions
export type LocaleCode = "en" | "zh" | "es" | "ja" | "fr" | "de" | "ko" | "ru"
export type LocaleMessages = Record<string, string>

// Supported languages
export const SUPPORTED_LOCALES: LocaleCode[] = ["en", "zh", "es", "ja", "fr", "de", "ko", "ru"]

// Default language
export const DEFAULT_LOCALE: LocaleCode = "en"

// All locale data
const LOCALES: Record<LocaleCode, LocaleMessages> = {
    en: enLocale,
    zh: zhLocale,
    es: esLocale,
    ja: jaLocale,
    fr: frLocale,
    de: deLocale,
    ko: koLocale,
    ru: ruLocale,
}

// Current locale (cached)
let currentLocale: LocaleCode = DEFAULT_LOCALE
let isInitialized = false

function sanitizeTrustedLocaleHtml(value: string): string {
    const hasUnsafePattern = SCRIPT_TAG_REGEX.test(value) || HTML_EVENT_HANDLER_REGEX.test(value) || JAVASCRIPT_URL_REGEX.test(value)

    if (hasUnsafePattern) {
        logger.warn("Blocked unsafe HTML in locale string")
        return value.replace(/<[^>]+>/g, "")
    }

    return value
}

/**
 * Get the best matching locale from browser settings
 */
function detectBrowserLocale(): LocaleCode {
    // Try to get browser UI language
    const languages = navigator.languages || [navigator.language]

    for (const lang of languages) {
        // Extract the language code (e.g., "en-US" -> "en", "zh-CN" -> "zh")
        const parts = lang.split("-")
        const langCode = parts[0]?.toLowerCase()

        if (langCode && SUPPORTED_LOCALES.includes(langCode as LocaleCode)) {
            return langCode as LocaleCode
        }
    }

    return DEFAULT_LOCALE
}

/**
 * Initialize i18n with auto-detected or specified locale
 */
export function initI18n(locale?: LocaleCode): LocaleCode {
    if (locale && SUPPORTED_LOCALES.includes(locale)) {
        currentLocale = locale
    } else {
        currentLocale = detectBrowserLocale()
    }

    isInitialized = true
    logger.info(`Initialized with locale: ${currentLocale}`)
    return currentLocale
}

/**
 * Get current locale
 */
export function getCurrentLocale(): LocaleCode {
    if (!isInitialized) {
        initI18n()
    }
    return currentLocale
}

/**
 * Set current locale
 */
export function setLocale(locale: LocaleCode): void {
    if (SUPPORTED_LOCALES.includes(locale)) {
        currentLocale = locale
        isInitialized = true
        logger.info(`Locale changed to: ${locale}`)
    } else {
        logger.warn(`Unsupported locale: ${locale}, keeping: ${currentLocale}`)
    }
}

/**
 * Get translation for a key
 * Falls back to English if not found, then to the key itself
 */
export function translate(key: string, locale?: LocaleCode): string {
    const targetLocale = locale || getCurrentLocale()
    const messages = LOCALES[targetLocale]

    // Try target locale first
    if (messages && messages[key] !== undefined) {
        return messages[key]
    }

    // Fallback to English
    if (targetLocale !== DEFAULT_LOCALE && LOCALES[DEFAULT_LOCALE][key]) {
        logger.debug(`Fallback to English for key: ${key}`)
        return LOCALES[DEFAULT_LOCALE][key]
    }

    // Return key if not found
    logger.warn(`Translation not found for key: ${key}`)
    return key
}

/**
 * Apply translations to all elements with data-i18n-key attribute
 * Call this after DOM is loaded
 */
export function applyTranslations(root: Document | Element = document): void {
    const locale = getCurrentLocale()
    const elements = root.querySelectorAll("[data-i18n-key]")

    elements.forEach((element) => {
        const key = element.getAttribute("data-i18n-key")
        if (!key) return

        const translatedText = translate(key, locale)
        const attr = element.getAttribute("data-i18n-attr")

        if (attr) {
            // Update specific attribute (e.g., title, placeholder, aria-label)
            element.setAttribute(attr, translatedText)
        } else {
            // Update text content
            const tagName = element.tagName.toLowerCase()

            if (tagName === "input" || tagName === "textarea") {
                // For input elements, update placeholder
                ;(element as HTMLInputElement).placeholder = translatedText
            } else if (element.hasAttribute("data-i18n-html")) {
                // For elements explicitly marked to allow HTML content
                element.innerHTML = sanitizeTrustedLocaleHtml(translatedText)
            } else {
                // For other elements, update inner text
                element.textContent = translatedText
            }
        }
    })

    // Update HTML lang attribute if applying to document
    if (root === document || root === document.documentElement) {
        document.documentElement.lang = locale
    }

    logger.info(`Applied translations for ${elements.length} elements`)
}

/**
 * Translate a template string by replacing {{key}} placeholders
 * Used for HTML templates loaded via ?raw import
 */
export function translateTemplate(template: string, locale?: LocaleCode): string {
    const targetLocale = locale || getCurrentLocale()

    // Replace all {{i18n:key}} patterns with translations
    return template.replace(/\{\{i18n:([^}]+)\}\}/g, (_, key) => {
        return translate(key.trim(), targetLocale)
    })
}

/**
 * Get all translations for current locale
 */
export function getAllTranslations(locale?: LocaleCode): LocaleMessages {
    return LOCALES[locale || getCurrentLocale()] || LOCALES[DEFAULT_LOCALE]
}

/**
 * Check if a locale is supported
 */
export function isLocaleSupported(locale: string): locale is LocaleCode {
    return SUPPORTED_LOCALES.includes(locale as LocaleCode)
}
