
import { describe, expect, it } from 'vitest';
import { addOpacityToHex } from '@/0_common/utils/colorUtils';

describe('colorUtils', () => {
    describe('addOpacityToHex', () => {
        it('should add opacity to valid 6-digit hex colors', () => {
            // 0.5 * 255 = 127.5 -> 128 -> 80
            expect(addOpacityToHex('#FF0000', 0.5)).toBe('#FF000080');
            // 1.0 -> FF
            expect(addOpacityToHex('#00FF00', 1)).toBe('#00FF00FF');
            // 0.0 -> 00
            expect(addOpacityToHex('#0000FF', 0)).toBe('#0000FF00');
            // 0.9 -> 229.5 -> 230 -> E6
            expect(addOpacityToHex('#123456', 0.9)).toBe('#123456E6');
        });

        it('should expand and add opacity to valid 3-digit hex colors', () => {
            expect(addOpacityToHex('#F00', 0.5)).toBe('#FF000080');
            expect(addOpacityToHex('#0F0', 1)).toBe('#00FF00FF');
            expect(addOpacityToHex('#00F', 0)).toBe('#0000FF00');
        });

        it('should return original string for invalid inputs', () => {
            // Missing #
            expect(addOpacityToHex('FF0000', 0.5)).toBe('FF0000');
            // Invalid characters
            expect(addOpacityToHex('#ZZZZZZ', 0.5)).toBe('#ZZZZZZ');
            // Invalid length (4 digits)
            expect(addOpacityToHex('#1234', 0.5)).toBe('#1234');
            // Invalid length (5 digits)
            expect(addOpacityToHex('#12345', 0.5)).toBe('#12345');
        });

        it('should preserve existing alpha channel (8-digit hex)', () => {
            // Should not modify if already has alpha
            expect(addOpacityToHex('#FF000080', 0.5)).toBe('#FF000080');
        });

        it('should clamp opacity values between 0 and 1', () => {
            // Clamp > 1 to 1
            expect(addOpacityToHex('#FF0000', 1.5)).toBe('#FF0000FF');
            // Clamp < 0 to 0
            expect(addOpacityToHex('#FF0000', -0.5)).toBe('#FF000000');
        });

        it('should handle edge cases for opacity rounding', () => {
            // Just barely above 0 -> 01
            expect(addOpacityToHex('#000000', 0.001)).toBe('#00000000'); 
            // Just barely below 1 -> FE? Or FF?
            // 0.999 * 255 = 254.745 -> 255 -> FF
            expect(addOpacityToHex('#000000', 0.999)).toBe('#000000FF');
        });
    });
});
