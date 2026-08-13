export type ThemeFont = {
  id: string;
  family: string;
  cssFamily: string;
};

const INTER: ThemeFont = {
  id: 'Inter',
  family: 'Inter',
  cssFamily: "'Inter', system-ui, sans-serif",
};

export const THEME_FONTS: readonly ThemeFont[] = [
  INTER,
  {
    id: 'Space Grotesk',
    family: 'Space Grotesk',
    cssFamily: "'Space Grotesk', system-ui, sans-serif",
  },
  {
    id: 'JetBrains Mono',
    family: 'JetBrains Mono',
    cssFamily: "'JetBrains Mono', ui-monospace, monospace",
  },
  {
    id: 'Playfair Display',
    family: 'Playfair Display',
    cssFamily: "'Playfair Display', Georgia, serif",
  },
  {
    id: 'Fraunces',
    family: 'Fraunces',
    cssFamily: "'Fraunces', Georgia, serif",
  },
  {
    id: 'Syne',
    family: 'Syne',
    cssFamily: "'Syne', system-ui, sans-serif",
  },
  {
    id: 'Fredoka',
    family: 'Fredoka',
    cssFamily: "'Fredoka', system-ui, sans-serif",
  },
  {
    id: 'Patrick Hand',
    family: 'Patrick Hand',
    cssFamily: "'Patrick Hand', 'Comic Sans MS', cursive",
  },
  {
    id: 'Baloo 2',
    family: 'Baloo 2',
    cssFamily: "'Baloo 2', system-ui, sans-serif",
  },
  {
    id: 'Amatic SC',
    family: 'Amatic SC',
    cssFamily: "'Amatic SC', 'Comic Sans MS', cursive",
  },
];

export const DEFAULT_THEME_FONT = INTER;

const normalize = (value: string): string => value.trim().toLowerCase();

export const findThemeFont = (value?: string): ThemeFont | undefined => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const needle = normalize(trimmed);
  return (
    THEME_FONTS.find(
      (font) =>
        normalize(font.id) === needle || normalize(font.family) === needle,
    ) ?? THEME_FONTS.find((font) => needle.includes(normalize(font.family)))
  );
};

export const matchThemeFont = (value?: string): ThemeFont =>
  findThemeFont(value) ?? DEFAULT_THEME_FONT;

export const resolveThemeFontCss = (value?: string): string | undefined => {
  if (!value?.trim()) return undefined;
  return findThemeFont(value)?.cssFamily ?? value.trim();
};
