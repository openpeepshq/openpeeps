import { describe, expect, it } from 'vitest';
import { contrastRatio, themeBackgroundHex } from './colors';

describe('contrastRatio', () => {
  it('is 21 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });

  it('is 1 for a color against itself', () => {
    expect(contrastRatio('#ffffff', themeBackgroundHex.light)).toBe(1);
    expect(contrastRatio('#09090b', themeBackgroundHex.dark)).toBe(1);
  });

  it('returns null for a value the color picker cannot store', () => {
    expect(contrastRatio('blue', '#ffffff')).toBeNull();
  });

  it('keeps the default brand color above the UI contrast floor', () => {
    expect(contrastRatio('#0c90a7', themeBackgroundHex.light)).toBeGreaterThan(
      3,
    );
    expect(contrastRatio('#0c90a7', themeBackgroundHex.dark)).toBeGreaterThan(
      3,
    );
  });

  it('flags a near-background color as low contrast', () => {
    expect(
      contrastRatio('#f4f4f5', themeBackgroundHex.light) ?? 99,
    ).toBeLessThan(3);
    expect(
      contrastRatio('#18181b', themeBackgroundHex.dark) ?? 99,
    ).toBeLessThan(3);
  });
});
