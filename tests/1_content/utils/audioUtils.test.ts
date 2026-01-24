import { describe, it, expect } from "vitest"
import { detectAudioMimeType } from "@/1_content/utils/audioUtils"

describe("audioUtils", () => {
    describe("detectAudioMimeType", () => {
        it("should detect WAV from RIFF header", () => {
            // "RIFF" -> Base64 "UklGRg=="
            const wavData = "UklGRgAAWABXQVZF" // RIFF...WAVE
            expect(detectAudioMimeType(wavData)).toBe("audio/wav")
        })

        it("should detect MP3 from ID3 header", () => {
            // "ID3" -> Base64 "SUQz"
            const mp3Data = "SUQzBAAAAAAA" // ID3...
            expect(detectAudioMimeType(mp3Data)).toBe("audio/mpeg")
        })

        it("should detect MP3 from frame sync (FF FB)", () => {
            // FF FB -> Base64 "//v"
            // FF (11111111) FB (11111011)
            // Base64 encoding:
            // 111111 (/) 111111 (/) 111011 (7) ...
            // Wait, let's verify my manual base64.
            // FF FB -> 11111111 11111011 -> 111111 111111 111011
            // 63 63 59 -> / / 7
            // So "//7" is the start.
            
            // Let's rely on atob in the implementation which decodes correctly.
            // We can construct the test string by encoding known bytes.
            
            // FF FB
            const mp3Data = btoa(String.fromCharCode(0xFF, 0xFB, 0x00, 0x00));
            expect(detectAudioMimeType(mp3Data)).toBe("audio/mpeg")
        })

         it("should detect MP3 from frame sync (FF F3)", () => {
            // FF F3
            const mp3Data = btoa(String.fromCharCode(0xFF, 0xF3, 0x00, 0x00));
            expect(detectAudioMimeType(mp3Data)).toBe("audio/mpeg")
        })

        it("should default to audio/wav for unknown data", () => {
            const unknownData = "AAAA"
            expect(detectAudioMimeType(unknownData)).toBe("audio/wav")
        })

        it("should default to audio/wav for empty data", () => {
             expect(detectAudioMimeType("")).toBe("audio/wav")
        })
    })
})
