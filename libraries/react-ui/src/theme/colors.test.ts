import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  generateA11yOnColor,
  themeBackgroundHex,
} from './colors';

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

describe('themeBackgroundHex', () => {
  it('matches --color-background in globals.css', () => {
    const css = readFileSync(
      new URL('../styles/globals.css', import.meta.url),
      'utf8',
    );
    const backgrounds = [
      ...css.matchAll(/--color-background:\s*(\d+)\s+(\d+)\s+(\d+);/g),
    ].map(
      (m) =>
        `#${[Number(m[1]), Number(m[2]), Number(m[3])]
          .map((n) => n.toString(16).padStart(2, '0'))
          .join('')}`,
    );
    // First occurrence is the light block, second the dark block.
    expect(backgrounds).toHaveLength(2);
    expect(backgrounds[0]).toBe(themeBackgroundHex.light);
    expect(backgrounds[1]).toBe(themeBackgroundHex.dark);
  });
});

describe('generateA11yOnColor', () => {
  it('picks black foreground for light colors', () => {
    expect(generateA11yOnColor('#ffffff')).toBe('0 0 0');
    expect(generateA11yOnColor('#0c90a7')).toBe('0 0 0');
  });

  it('picks white foreground for dark colors', () => {
    expect(generateA11yOnColor('#000000')).toBe('255 255 255');
    expect(generateA11yOnColor('#09090b')).toBe('255 255 255');
  });

  it('falls back to white for an unparseable color', () => {
    expect(generateA11yOnColor('blue')).toBe('255 255 255');
  });
});
