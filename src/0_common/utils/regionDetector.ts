/**
 * Region Detector Utility
 * 
 * Helper functions to detect user region based on browser settings
 */

/**
 * Check if the user is likely in Mainland China
 * 
 * Criteria:
 * 1. User language starts with 'zh' (Chinese)
 * 2. Timezone matches China Standard Time (Asia/Shanghai, PRC, etc.)
 */
export function isLikelyChineseUser(): boolean {
    // Check language
    const language = (navigator?.language || "").toLowerCase()
    const isChineseLang = language.startsWith("zh")

    if (!isChineseLang) {
        return false
    }

    // Check timezone
    const CHINA_TIMEZONE_NAMES = [
        "asia/shanghai",
        "asia/beijing",
        "asia/chongqing",
        "asia/harbin",
        "asia/urumqi",
        "prc",
    ]

    try {
        const resolvedOptions = Intl.DateTimeFormat().resolvedOptions()
        const timeZone = (resolvedOptions.timeZone || "").toLowerCase()
        return CHINA_TIMEZONE_NAMES.includes(timeZone)
    } catch (e) {
        return false
    }
}
