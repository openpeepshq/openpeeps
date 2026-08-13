import { describe, expect, it } from 'vitest';
import { isExternalLink } from './linkTargets';

describe('isExternalLink', () => {
  const origin = 'https://app.example';

  it('treats same-origin and relative hrefs as internal', () => {
    expect(isExternalLink('/@alice', origin)).toBe(false);
    expect(isExternalLink('/posts/abc', origin)).toBe(false);
    expect(isExternalLink('https://app.example/groups/x', origin)).toBe(false);
  });

  it('treats other origins as external', () => {
    expect(isExternalLink('https://news.example/story', origin)).toBe(true);
    expect(isExternalLink('http://example.com', origin)).toBe(true);
  });

  it('ignores mailto, tel, and hash', () => {
    expect(isExternalLink('mailto:a@b.c', origin)).toBe(false);
    expect(isExternalLink('tel:+1555', origin)).toBe(false);
    expect(isExternalLink('#section', origin)).toBe(false);
  });
});
