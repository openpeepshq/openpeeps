import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THEME_FONT,
  findThemeFont,
  matchThemeFont,
  resolveThemeFontCss,
  THEME_FONTS,
} from './fonts';

describe('theme fonts', () => {
  it('lists ten webpage fonts', () => {
    expect(THEME_FONTS).toHaveLength(10);
    expect(DEFAULT_THEME_FONT.family).toBe('Inter');
  });

  it('matches stored CSS stacks and unknown values', () => {
    expect(findThemeFont(undefined)).toBeUndefined();
    expect(matchThemeFont('Playfair Display').id).toBe('Playfair Display');
    expect(matchThemeFont('Inter, system-ui, sans-serif').id).toBe('Inter');
    expect(matchThemeFont('Comic Sans')).toBe(DEFAULT_THEME_FONT);
  });

  it('resolves CSS family stacks for known fonts', () => {
    expect(resolveThemeFontCss(undefined)).toBeUndefined();
    expect(resolveThemeFontCss('Fraunces')).toBe("'Fraunces', Georgia, serif");
    expect(resolveThemeFontCss('Custom, fantasy')).toBe('Custom, fantasy');
  });
});
