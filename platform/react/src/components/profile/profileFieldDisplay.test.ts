import { describe, expect, it } from 'vitest';
import { profileFieldLink, truncateUrl } from './profileFieldDisplay';

describe('truncateUrl', () => {
  it('keeps short URLs intact', () => {
    expect(truncateUrl('https://example.com')).toBe('https://example.com');
  });

  it('keeps origin and first path segment', () => {
    expect(
      truncateUrl('https://www.linkedin.com/in/jane-doe-a1b2c3d4e5f6'),
    ).toBe('https://www.linkedin.com/in...');
  });

  it('falls back to origin when the first segment is long', () => {
    expect(
      truncateUrl(
        'https://gitlab.allpeep-hq.com/allpeep/customers/jsd/-/boards?not[assignee_username]=jeremiah',
      ),
    ).toBe('https://gitlab.allpeep-hq.com/...');
  });
});

describe('profileFieldLink', () => {
  it('treats a bare URL as a link', () => {
    expect(profileFieldLink('  https://www.linkedin.com/in/jane  ')).toEqual({
      href: 'https://www.linkedin.com/in/jane',
      display: 'https://www.linkedin.com/in/jane',
    });
  });

  it('truncates long bare URLs', () => {
    const href =
      'https://gitlab.allpeep-hq.com/allpeep/customers/jsd/-/boards?foo=1';
    expect(profileFieldLink(href)).toEqual({
      href,
      display: 'https://gitlab.allpeep-hq.com/...',
    });
  });

  it('truncates markdown links whose text is the URL', () => {
    const href = 'https://www.linkedin.com/in/jane-doe-a1b2c3d4e5f6';
    expect(profileFieldLink(`[${href}](${href})`)).toEqual({
      href,
      display: 'https://www.linkedin.com/in...',
    });
  });

  it('keeps custom markdown link text', () => {
    expect(
      profileFieldLink('[My site](https://www.example.com/very/long/path)'),
    ).toEqual({
      href: 'https://www.example.com/very/long/path',
      display: 'My site',
    });
  });

  it('returns null for non-link fields', () => {
    expect(profileFieldLink('Software engineer')).toBeNull();
  });
});
