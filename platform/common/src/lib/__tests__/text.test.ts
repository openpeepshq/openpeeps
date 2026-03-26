import { describe, it, expect } from 'vitest';
import { truncateText, randomString, capitalizeFirstLetter } from '../text';

describe('text', () => {
  describe('truncateText', () => {
    it('should truncate text longer than maxLength', () => {
      expect(truncateText('Hello World', 5)).toBe('Hello...');
      expect(truncateText('This is a very long text', 10)).toBe(
        'This is a ...',
      );
    });

    it('should return original text if shorter than maxLength', () => {
      expect(truncateText('Hello', 10)).toBe('Hello');
      expect(truncateText('Short', 5)).toBe('Short');
    });

    it('should return original text if equal to maxLength', () => {
      expect(truncateText('Hello', 5)).toBe('Hello');
    });

    it('should use default maxLength of 15', () => {
      expect(
        truncateText('This is a very long text that exceeds default length'),
      ).toBe('This is a very ...');
    });

    it('should return empty string for undefined input', () => {
      expect(truncateText(undefined)).toBe('');
    });

    it('should return empty string for null input', () => {
      expect(truncateText(null)).toBe('');
    });

    it('should handle empty string', () => {
      expect(truncateText('')).toBe('');
    });
  });

  describe('randomString', () => {
    it('should generate string of specified length', () => {
      const result = randomString(10);
      expect(result).toHaveLength(10);
    });

    it('should generate different strings on multiple calls', () => {
      const result1 = randomString(10);
      const result2 = randomString(10);
      expect(result1).not.toBe(result2);
    });

    it('should use default character set', () => {
      const result = randomString(5);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should use custom character set', () => {
      const customChars = 'ABC123';
      const result = randomString(10, customChars);
      expect(result).toMatch(/^[ABC123]+$/);
    });

    it('should handle zero length', () => {
      const result = randomString(0);
      expect(result).toBe('');
    });

    it('should handle single character set', () => {
      const result = randomString(5, 'A');
      expect(result).toBe('AAAAA');
    });

    it('should generate different strings with same custom character set', () => {
      const customChars = 'AB';
      const results = Array.from({ length: 10 }, () =>
        randomString(5, customChars),
      );
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(1);
    });
  });

  describe('capitalizeFirstLetter', () => {
    it('should capitalize first letter of string', () => {
      expect(capitalizeFirstLetter('hello')).toBe('Hello');
      expect(capitalizeFirstLetter('world')).toBe('World');
      expect(capitalizeFirstLetter('test')).toBe('Test');
    });

    it('should handle single character', () => {
      expect(capitalizeFirstLetter('a')).toBe('A');
      expect(capitalizeFirstLetter('z')).toBe('Z');
    });

    it('should handle already capitalized string', () => {
      expect(capitalizeFirstLetter('Hello')).toBe('Hello');
      expect(capitalizeFirstLetter('WORLD')).toBe('WORLD');
    });

    it('should handle empty string', () => {
      expect(capitalizeFirstLetter('')).toBe('');
    });

    it('should handle string with numbers', () => {
      expect(capitalizeFirstLetter('123abc')).toBe('123abc');
      expect(capitalizeFirstLetter('abc123')).toBe('Abc123');
    });

    it('should handle string with special characters', () => {
      expect(capitalizeFirstLetter('!hello')).toBe('!hello');
      expect(capitalizeFirstLetter('@world')).toBe('@world');
    });
  });
});
