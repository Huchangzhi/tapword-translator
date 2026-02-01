import { createLogger } from "@/0_common/utils/logger"

const logger = createLogger("OffscreenManager")

const OFFSCREEN_PATH = "src/9_offscreen/offscreen.html"

export async function playAudio(base64Audio: string): Promise<void> {
    await ensureOffscreenDocument()
    
    try {
        const response = await chrome.runtime.sendMessage({
            type: "PLAY_AUDIO",
            data: { audio: base64Audio }
        })
        
        if (response && !response.success) {
            throw new Error(response.error || "Unknown playback error")
        }
    } catch (e) {
        logger.error("Failed to send play message or playback failed", e)
        throw e
    }
}

export async function stopAudio(): Promise<void> {
    const hasDoc = await chrome.offscreen.hasDocument()
    if (!hasDoc) return

    try {
        await chrome.runtime.sendMessage({
            type: "STOP_AUDIO"
        })
    } catch (e) {
        logger.warn("Failed to stop audio (maybe document closed)", e)
    }
}

async function ensureOffscreenDocument(): Promise<void> {
    const hasDoc = await chrome.offscreen.hasDocument()
    if (hasDoc) {
        return
    }

    logger.info("Creating offscreen document")
    try {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_PATH,
            reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
            justification: "Playback of translated text speech",
        })
    } catch (error) {
        logger.error("Failed to create offscreen document", error)
        throw error
    }
}
