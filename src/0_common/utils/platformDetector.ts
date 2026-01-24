/**
 * Platform Detector Utility
 *
 * reliably detects the user's operating system using Chrome Extension API
 * or fallback methods.
 */

export const PLATFORMS = {
    MAC: "mac",
    WIN: "win",
    ANDROID: "android",
    CROS: "cros",
    LINUX: "linux",
    OPENBSD: "openbsd",
    UNKNOWN: "unknown",
} as const

export type PlatformOS = typeof PLATFORMS[keyof typeof PLATFORMS]

/**
 * Get the current platform OS.
 * Prioritizes chrome.runtime.getPlatformInfo() if available.
 * Falls back to navigator.userAgent parsing.
 */
export async function getPlatformOS(): Promise<PlatformOS> {
    // 1. Try Chrome Extension API (Most reliable)
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getPlatformInfo) {
        try {
            const info = await chrome.runtime.getPlatformInfo()
            return info.os as PlatformOS
        } catch (e) {
            // Ignore error and fall back
        }
    }

    // 2. Fallback to User Agent / Navigator (Synchronous, less reliable but works everywhere)
    // Note: navigator.platform is deprecated but still widely supported.
    // navigator.userAgentData is the modern replacement but has limited support.
    
    const userAgent = navigator.userAgent || ""
    const platform = navigator.platform || ""

    if (/Mac|iPod|iPhone|iPad/.test(platform) || /Mac/i.test(userAgent)) {
        return PLATFORMS.MAC
    }

    if (/Win/.test(platform) || /Win/i.test(userAgent)) {
        return PLATFORMS.WIN
    }

    if (/Android/.test(userAgent)) {
        return PLATFORMS.ANDROID
    }

    if (/CrOS/.test(userAgent)) {
        return PLATFORMS.CROS
    }

    if (/Linux/.test(platform) || /Linux/.test(userAgent)) {
        return PLATFORMS.LINUX
    }

    return PLATFORMS.UNKNOWN
}