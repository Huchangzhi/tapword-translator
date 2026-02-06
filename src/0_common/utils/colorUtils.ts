/**
 * Color manipulation utilities
 */

/**
 * Adds alpha/opacity to a hex color string.
 * Returns a CSS-compatible 8-digit hex string (#RRGGBBAA).
 * 
 * @param color Hex color string (e.g., "#FF0000" or "#F00")
 * @param opacity Opacity value between 0.0 and 1.0
 * @returns The color with alpha channel applied, or the original color if input is invalid
 */
export function addOpacityToHex(color: string, opacity: number): string {
    // Basic validation: must start with #
    if (!color || !color.startsWith("#")) {
        return color
    }

    // Strip #
    const hex = color.slice(1)

    // Validate hex content
    if (!/^[0-9A-Fa-f]+$/.test(hex)) {
        return color
    }

    let fullHex = hex

    // Expand shorthand #RGB to #RRGGBB
    if (hex.length === 3) {
        fullHex = hex.split("").map((c) => c + c).join("")
    }

    // Ensure we have exactly 6 digits (RRGGBB) before appending alpha
    // If it's already 8 digits, we skip modification to avoid breaking existing alpha
    if (fullHex.length !== 6) {
        return color
    }

    // Clamp opacity between 0 and 1
    const safeOpacity = Math.max(0, Math.min(1, opacity))
    
    // Convert to 0-255 integer
    const alphaInt = Math.round(safeOpacity * 255)
    
    // Convert to 2-digit hex
    const alphaHex = alphaInt.toString(16).padStart(2, "0").toUpperCase()

    return `#${fullHex}${alphaHex}`
}
