/**
 * Debug Utilities for Popup
 *
 * Provides logging utilities to diagnose popup width issues
 */

import * as loggerModule from "@/0_common/utils/logger"

const logger = loggerModule.createLogger("Popup/Debug")

// Debug prefix for width diagnostics
const WIDTH_DEBUG_PREFIX = "POPUP_WIDTH_DEBUG"

/**
 * Log current dimension metrics of key popup elements to help diagnose sporadic narrow width issue
 */
export function logWidths(phase: string): void {
    try {
        const htmlEl = document.documentElement
        const bodyEl = document.body
        const container = document.querySelector<HTMLElement>(".popup-container")
        const header = document.querySelector<HTMLElement>(".popup-header")
        const settings = document.querySelector<HTMLElement>(".settings-list")

        const metrics = {
            phase,
            timestamp: new Date().toISOString(),
            viewport: { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
            html: { clientWidth: htmlEl?.clientWidth, scrollWidth: htmlEl?.scrollWidth },
            body: {
                styleWidth: bodyEl?.style.width || null,
                clientWidth: bodyEl?.clientWidth,
                scrollWidth: bodyEl?.scrollWidth,
                offsetWidth: bodyEl?.offsetWidth,
            },
            container: container
                ? {
                      present: true,
                      clientWidth: container.clientWidth,
                      scrollWidth: container.scrollWidth,
                      offsetWidth: container.offsetWidth,
                  }
                : { present: false },
            header: header ? { clientWidth: header.clientWidth } : { present: false },
            settings: settings ? { clientWidth: settings.clientWidth } : { present: false },
            cssComputed: (() => {
                if (!bodyEl) return null
                const cs = getComputedStyle(bodyEl)
                return {
                    computedWidth: cs.width,
                    minWidth: cs.minWidth,
                }
            })(),
        }
        logger.info(WIDTH_DEBUG_PREFIX, metrics)
    } catch (err) {
        logger.warn(WIDTH_DEBUG_PREFIX, "Failed to log widths", err)
    }
}

/**
 * Schedule deferred width measurements after CSS is fully loaded
 */
export function scheduleDeferredWidthMeasurements(): void {
    requestAnimationFrame(() => {
        logWidths("raf-1")
        requestAnimationFrame(() => {
            logWidths("raf-2")
            setTimeout(() => logWidths("timeout-150ms"), 150)
            setTimeout(() => logWidths("timeout-400ms"), 400)
        })
    })
}
