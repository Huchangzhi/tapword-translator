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
    const language = navigator.language.toLowerCase()
    const isChineseLang = language.startsWith("zh")

    if (!isChineseLang) {
        return false
    }

    // Check timezone
    try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const chinaTimeZones = [
            "Asia/Shanghai",
            "Asia/Chongqing", 
            "Asia/Harbin",
            "Asia/Urumqi",
            "PRC"
        ]
        
        return chinaTimeZones.includes(timeZone)
    } catch (e) {
        // If timezone detection fails, rely on language match
        return true
    }
}
