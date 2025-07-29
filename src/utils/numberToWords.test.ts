import { describe, it, expect } from 'vitest';
import { numberToWords } from './numberToWords';

describe('numberToWords', () => {
    it('should convert 1 to "one"', () => {
        expect(numberToWords(1)).toBe('one');
    });

    it('should convert 5 to "five"', () => {
        expect(numberToWords(5)).toBe('five');
    });

    it('should convert 10 to "ten"', () => {
        expect(numberToWords(10)).toBe('ten');
    });

    it('should convert 21 to "twenty one"', () => {
        expect(numberToWords(21)).toBe('twenty one');
    });

    it('should convert 100 to "one hundred"', () => {
        expect(numberToWords(100)).toBe('one hundred');
    });
});