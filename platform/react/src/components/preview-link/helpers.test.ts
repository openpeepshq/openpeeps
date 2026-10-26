import { describe, expect, it } from 'vitest';
import {
  firstMarkdownImage,
  isLocalLink,
  isWelcomePath,
  welcomePreviewExcerpt,
} from './helpers';

describe('isWelcomePath', () => {
  it('matches the welcome route only', () => {
    expect(isWelcomePath('/welcome')).toBe(true);
    expect(isWelcomePath('/welcome/')).toBe(true);
    expect(isWelcomePath('/welcome/extra')).toBe(false);
    expect(isWelcomePath('/Welcome')).toBe(false);
    expect(isWelcomePath('/feeds/local')).toBe(false);
  });
});

describe('isLocalLink', () => {
  const origin = 'https://app.example';

  it('treats a same-origin welcome url as a local preview', () => {
    expect(isLocalLink('https://app.example/welcome', origin)).toBe(true);
    expect(isLocalLink('https://app.example/welcome/', origin)).toBe(true);
    expect(isLocalLink('https://app.example/welcome?from=feed', origin)).toBe(
      true,
    );
    expect(isLocalLink('https://other.example/welcome', origin)).toBe(false);
    expect(isLocalLink('not a url', origin)).toBe(false);
  });
});

describe('welcomePreviewExcerpt', () => {
  it('drops image markup and clips on a word boundary', () => {
    const markdown = `![Banner](/img/banner.png)

${'Welcome aboard. '.repeat(30)}`;
    const excerpt = welcomePreviewExcerpt(markdown);
    expect(excerpt.startsWith('Welcome aboard.')).toBe(true);
    expect(excerpt.includes('/img/banner.png')).toBe(false);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(excerpt.length).toBeLessThan(markdown.length);
  });

  it('returns an empty string for missing content', () => {
    expect(welcomePreviewExcerpt(undefined)).toBe('');
    expect(welcomePreviewExcerpt('   ')).toBe('');
  });
});

describe('firstMarkdownImage', () => {
  it('returns the first content image and skips data urls', () => {
    expect(
      firstMarkdownImage('![x](data:image/png;base64,aaaa) ![Banner](/a.png)'),
    ).toBe('/a.png');
    expect(firstMarkdownImage('![Banner](<https://cdn.example/a.png>)')).toBe(
      'https://cdn.example/a.png',
    );
    expect(firstMarkdownImage('no image here')).toBeUndefined();
  });
});
