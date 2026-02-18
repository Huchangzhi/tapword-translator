/**
 * Debug Utilities for Popup
 *
 * Provides logging utilities to diagnose popup width issues
 */

import * as loggerModule from "@/0_common/utils/logger"

const logger = loggerModule.createLogger("Popup/Debug")

// Debug prefix for dimension diagnostics
const DIMENSION_DEBUG_PREFIX = "POPUP_DIMENSION_DEBUG"

/**
 * Log current dimension metrics of key popup elements to help diagnose sporadic narrow width and height issues
 */
export function logDimensions(phase: string): void {
    try {
        const htmlEl = document.documentElement
        const bodyEl = document.body
        const container = document.querySelector<HTMLElement>(".popup-container")
        const content = document.querySelector<HTMLElement>(".popup-content")
        const header = document.querySelector<HTMLElement>(".popup-header")
        const settings = document.querySelector<HTMLElement>(".settings-list")
        const footer = document.querySelector<HTMLElement>(".popup-footer")

        const metrics = {
            phase,
            timestamp: new Date().toISOString(),
            viewport: { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
            html: {
                clientWidth: htmlEl?.clientWidth,
                scrollWidth: htmlEl?.scrollWidth,
                clientHeight: htmlEl?.clientHeight,
                scrollHeight: htmlEl?.scrollHeight,
                offsetHeight: htmlEl?.offsetHeight,
            },
            body: {
                styleWidth: bodyEl?.style.width || null,
                styleHeight: bodyEl?.style.height || null,
                clientWidth: bodyEl?.clientWidth,
                scrollWidth: bodyEl?.scrollWidth,
                clientHeight: bodyEl?.clientHeight,
                scrollHeight: bodyEl?.scrollHeight,
                offsetHeight: bodyEl?.offsetHeight,
            },
            container: container
                ? {
                      present: true,
                      clientWidth: container.clientWidth,
                      scrollWidth: container.scrollWidth,
                      clientHeight: container.clientHeight,
                      scrollHeight: container.scrollHeight,
                      offsetHeight: container.offsetHeight,
                  }
                : { present: false },
            content: content
                ? {
                      present: true,
                      clientWidth: content.clientWidth,
                      scrollWidth: content.scrollWidth,
                      clientHeight: content.clientHeight,
                      scrollHeight: content.scrollHeight,
                      offsetHeight: content.offsetHeight,
                  }
                : { present: false },
            header: header ? { clientWidth: header.clientWidth, clientHeight: header.clientHeight, offsetHeight: header.offsetHeight } : { present: false },
            settings: settings
                ? {
                      clientWidth: settings.clientWidth,
                      clientHeight: settings.clientHeight,
                      scrollHeight: settings.scrollHeight,
                      offsetHeight: settings.offsetHeight,
                  }
                : { present: false },
            footer: footer ? { clientWidth: footer.clientWidth, clientHeight: footer.clientHeight, offsetHeight: footer.offsetHeight } : { present: false },
            cssComputed: (() => {
                if (!bodyEl) return null
                const cs = getComputedStyle(bodyEl)
                return {
                    computedWidth: cs.width,
                    minWidth: cs.minWidth,
                    computedHeight: cs.height,
                    minHeight: cs.minHeight,
                    maxHeight: cs.maxHeight,
                }
            })(),
        }
        logger.info(DIMENSION_DEBUG_PREFIX, metrics)
    } catch (err) {
        logger.warn(DIMENSION_DEBUG_PREFIX, "Failed to log dimensions", err)
    }
}

/**
 * Schedule deferred dimension measurements after CSS is fully loaded
 */
export function scheduleDeferredWidthMeasurements(): void {
    requestAnimationFrame(() => {
        logDimensions("raf-1")
        requestAnimationFrame(() => {
            logDimensions("raf-2")
            setTimeout(() => logDimensions("timeout-150ms"), 150)
            setTimeout(() => logDimensions("timeout-400ms"), 400)
        })
    })
}
