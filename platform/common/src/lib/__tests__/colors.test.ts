import { describe, it, expect } from 'vitest';
import { hexToRgb } from '../colors';

describe('colors', () => {
  describe('hexToRgb', () => {
    it('should convert hex color to RGB object', () => {
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should handle hex colors without hash', () => {
      expect(hexToRgb('FF0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('00FF00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('0000FF')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should handle mixed case hex colors', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#FFff00')).toEqual({ r: 255, g: 255, b: 0 });
      expect(hexToRgb('#aAbBcC')).toEqual({ r: 170, g: 187, b: 204 });
    });

    it('should handle 3-character hex colors', () => {
      expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#0F0')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#00F')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should handle various color values', () => {
      expect(hexToRgb('#808080')).toEqual({ r: 128, g: 128, b: 128 });
      expect(hexToRgb('#FFA500')).toEqual({ r: 255, g: 165, b: 0 });
      expect(hexToRgb('#800080')).toEqual({ r: 128, g: 0, b: 128 });
    });
  });
});
