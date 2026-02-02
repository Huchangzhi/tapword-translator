import { createLogger } from "@/0_common/utils/logger"

const logger = createLogger("OffscreenManager")

const OFFSCREEN_PATH = "src/9_offscreen/offscreen.html"
const OFFSCREEN_UNSUPPORTED_ERROR = "Offscreen API is not available in this browser"

type OffscreenApi = typeof chrome.offscreen

function getOffscreenApi(): OffscreenApi | undefined {
    return (chrome as typeof chrome & { offscreen?: OffscreenApi }).offscreen
}

function isOffscreenSupported(): boolean {
    const offscreenApi = getOffscreenApi()
    return Boolean(offscreenApi?.createDocument && offscreenApi?.hasDocument)
}

export async function playAudio(base64Audio: string): Promise<void> {
    if (!isOffscreenSupported()) {
        const error = new Error(OFFSCREEN_UNSUPPORTED_ERROR)
        logger.warn(error.message)
        throw error
    }

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
    if (!isOffscreenSupported()) {
        logger.warn(OFFSCREEN_UNSUPPORTED_ERROR)
        return
    }

    const offscreenApi = getOffscreenApi()
    if (!offscreenApi) {
        return
    }

    const hasDoc = await offscreenApi.hasDocument()
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
    if (!isOffscreenSupported()) {
        throw new Error(OFFSCREEN_UNSUPPORTED_ERROR)
    }

    const offscreenApi = getOffscreenApi()
    if (!offscreenApi) {
        throw new Error(OFFSCREEN_UNSUPPORTED_ERROR)
    }

    const hasDoc = await offscreenApi.hasDocument()
    if (hasDoc) {
        return
    }

    logger.info("Creating offscreen document")
    try {
        await offscreenApi.createDocument({
            url: OFFSCREEN_PATH,
            reasons: [offscreenApi.Reason.AUDIO_PLAYBACK],
            justification: "Playback of translated text speech",
        })
    } catch (error) {
        logger.error("Failed to create offscreen document", error)
        throw error
    }
}
