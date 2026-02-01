import { createLogger } from "@/0_common/utils/logger"
import { detectAudioMimeType } from "@/0_common/utils/audioUtils"

const logger = createLogger("offscreen")

const PLAYBACK_FAILED_ERROR = "Playback failed"
const UNKNOWN_ERROR = "Unknown error"

logger.info("Offscreen document initialized")

let currentAudio: HTMLAudioElement | null = null

function stopAndCleanupAudio(audio: HTMLAudioElement): void {
    audio.onended = null
    audio.onerror = null
    audio.pause()
}

function clearCurrentAudioIfMatch(audio: HTMLAudioElement): void {
    if (currentAudio === audio) {
        currentAudio = null
    }
}

function createResponseSender(sendResponse: (response: any) => void): (response: any) => void {
    let responseSent = false

    return (response: any) => {
        if (responseSent) {
            return
        }
        responseSent = true
        sendResponse(response)
    }
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    logger.info("Received message in offscreen:", message.type)

    if (message.type === "PLAY_AUDIO") {
        handlePlayAudio(message.data, sendResponse)
        return true // Keep channel open for async response
    } else if (message.type === "STOP_AUDIO") {
        handleStopAudio(sendResponse)
        return false // Synchronous response
    }
    return false
})

async function handlePlayAudio(data: { audio: string }, sendResponse: (response: any) => void) {
    const sendResponseOnce = createResponseSender(sendResponse)

    try {
        if (currentAudio) {
            stopAndCleanupAudio(currentAudio)
            currentAudio = null
        }

        const mimeType = detectAudioMimeType(data.audio)
        const audioDataUrl = `data:${mimeType};base64,${data.audio}`
        
        const audio = new Audio(audioDataUrl)
        currentAudio = audio

        audio.onended = () => {
            logger.info("Audio playback finished")
            clearCurrentAudioIfMatch(audio)
        }

        audio.onerror = (e) => {
            logger.error("Audio playback error:", e)
            sendResponseOnce({ success: false, error: PLAYBACK_FAILED_ERROR })
            clearCurrentAudioIfMatch(audio)
        }

        await audio.play()
        logger.info("Audio playback started")
        sendResponseOnce({ success: true })
        
    } catch (error) {
        logger.error("Failed to play audio:", error)
        sendResponseOnce({ success: false, error: error instanceof Error ? error.message : UNKNOWN_ERROR })
    }
}

function handleStopAudio(sendResponse: (response: any) => void) {
    if (currentAudio) {
        stopAndCleanupAudio(currentAudio)
        currentAudio = null
        logger.info("Audio playback stopped")
    }
    sendResponse({ success: true })
}
