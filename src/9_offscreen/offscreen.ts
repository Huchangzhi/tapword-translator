import { createLogger } from "@/0_common/utils/logger"
import { detectAudioMimeType } from "@/0_common/utils/audioUtils"

const logger = createLogger("offscreen")

logger.info("Offscreen document initialized")

let currentAudio: HTMLAudioElement | null = null

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
    try {
        if (currentAudio) {
            currentAudio.pause()
            currentAudio = null
        }

        const mimeType = detectAudioMimeType(data.audio)
        const audioDataUrl = `data:${mimeType};base64,${data.audio}`
        
        currentAudio = new Audio(audioDataUrl)
        
        // Handle playback end to clean up reference
        currentAudio.onended = () => {
            logger.info("Audio playback finished")
            currentAudio = null
        }

        currentAudio.onerror = (e) => {
            logger.error("Audio playback error:", e)
            sendResponse({ success: false, error: "Playback failed" })
            currentAudio = null
        }

        await currentAudio.play()
        logger.info("Audio playback started")
        sendResponse({ success: true })
        
    } catch (error) {
        logger.error("Failed to play audio:", error)
        sendResponse({ success: false, error: error instanceof Error ? error.message : "Unknown error" })
    }
}

function handleStopAudio(sendResponse: (response: any) => void) {
    if (currentAudio) {
        currentAudio.pause()
        currentAudio = null
        logger.info("Audio playback stopped")
    }
    sendResponse({ success: true })
}
