import { emojis } from '../components/jams/constants';

const SKIN_TONE_PATTERN = /[\u{1F3FB}-\u{1F3FF}]/u;

export const SKIN_TONE_MODIFIERS = [
  '',
  '\u{1F3FB}',
  '\u{1F3FC}',
  '\u{1F3FD}',
  '\u{1F3FE}',
  '\u{1F3FF}',
];

export const SKIN_TONE_OPTIONS = [
  { tone: 0, emoji: '🖐️' },
  { tone: 1, emoji: '🖐🏻' },
  { tone: 2, emoji: '🖐🏼' },
  { tone: 3, emoji: '🖐🏽' },
  { tone: 4, emoji: '🖐🏾' },
  { tone: 5, emoji: '🖐🏿' },
] as const;

const defaultBaseEmojis = emojis.map(stripSkinTone);

const skinToneCapableDefaults = new Set(
  emojis.filter((emoji) => SKIN_TONE_PATTERN.test(emoji)).map(stripSkinTone),
);

export function stripSkinTone(emoji: string): string {
  return emoji.replace(SKIN_TONE_PATTERN, '');
}

export function supportsSkinTone(emoji: string): boolean {
  const base = stripSkinTone(emoji);
  return SKIN_TONE_PATTERN.test(emoji) || skinToneCapableDefaults.has(base);
}

export function applySkinTone(emoji: string, skinTone: number): string {
  if (!supportsSkinTone(emoji)) {
    return emoji;
  }
  const base = stripSkinTone(emoji);
  return base + (SKIN_TONE_MODIFIERS[skinTone] ?? '');
}

export function applySkinToneToDefault(
  emoji: string,
  skinTone: number,
): string {
  const base = stripSkinTone(emoji);
  if (!skinToneCapableDefaults.has(base)) {
    return base;
  }
  return applySkinTone(emoji, skinTone);
}

export function applySkinToneToRecentEmojis(
  recentEmojis: string[],
  skinTone: number,
): string[] {
  return recentEmojis.map((emoji) => applySkinTone(emoji, skinTone));
}

export function isDefaultEmoji(emoji: string): boolean {
  return defaultBaseEmojis.includes(stripSkinTone(emoji));
}

export function addRecentEmoji(
  recentEmojis: string[],
  emoji: string,
): string[] {
  const withoutDuplicate = recentEmojis.filter((item) => item !== emoji);
  return [emoji, ...withoutDuplicate].slice(0, 3);
}

export function getSkinToneEmoji(tone: number): string {
  return (
    SKIN_TONE_OPTIONS.find((option) => option.tone === tone)?.emoji ??
    SKIN_TONE_OPTIONS[0].emoji
  );
}
