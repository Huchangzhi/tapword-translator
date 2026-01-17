/**
 * Audio processing utilities
 */

/**
 * Detects the MIME type of audio data from its Base64 representation.
 * Supports WAV (RIFF) and MP3 (ID3 or Frame Sync).
 *
 * @param base64Data - The Base64 encoded audio data.
 * @returns The detected MIME type (e.g., "audio/wav", "audio/mpeg"). Defaults to "audio/wav".
 */
export function detectAudioMimeType(base64Data: string): string {
    if (!base64Data) {
        return "audio/wav"
    }

    try {
        // Decode the first few bytes to check the signature (Magic Bytes)
        // We only need the first 4 bytes to distinguish RIFF and ID3
        const header = atob(base64Data.substring(0, 20)).substring(0, 4)

        const hex = []
        for (let i = 0; i < header.length; i++) {
            hex.push(header.charCodeAt(i).toString(16).toUpperCase().padStart(2, "0"))
        }
        const signature = hex.join(" ")

        // RIFF (WAV) -> "52 49 46 46"
        if (signature.startsWith("52 49 46 46")) {
            return "audio/wav"
        }

        // ID3 (MP3) -> "49 44 33"
        if (signature.startsWith("49 44 33")) {
            return "audio/mpeg"
        }

        // MP3 Frame Sync (MPEG 1/2/2.5 Layer III)
        // Sync word is 11 bits set to 1.
        // First byte: FF (11111111)
        // Second byte: E0 (11100000) masked with F0 should be E0, F0, etc.
        // Commonly FF FB, FF F3, FF F2.
        if (header.length >= 2) {
            const byte1 = header.charCodeAt(0)
            const byte2 = header.charCodeAt(1)
            // Check for 0xFF and (byte2 & 0xE0) == 0xE0
            if (byte1 === 0xff && (byte2 & 0xe0) === 0xe0) {
                return "audio/mpeg"
            }
        }

        return "audio/wav"
    } catch (e) {
        // Fallback if decoding fails
        return "audio/wav"
    }
}
