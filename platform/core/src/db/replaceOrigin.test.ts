import { describe, expect, it } from 'vitest';
import { replaceOriginInValue } from './replaceOrigin';

describe('replaceOriginInValue', () => {
  it('drops the old scheme and port when restoring onto localhost', () => {
    const result = replaceOriginInValue(
      'https://community.example/storage/allpeep/abc/logo.svg',
      'community.example',
      'http://localhost:5174',
    );
    expect(result).toBe('http://localhost:5174/storage/allpeep/abc/logo.svg');
  });

  it('rewrites a prod origin with a port to the new origin', () => {
    expect(
      replaceOriginInValue(
        'https://community.example:8443/img/a.png',
        'community.example',
        'http://localhost:5174',
      ),
    ).toBe('http://localhost:5174/img/a.png');
  });

  it('preserves path, query, and hash', () => {
    expect(
      replaceOriginInValue(
        'https://old.example/a/b?x=1&y=2#frag',
        'old.example',
        'https://new.example',
      ),
    ).toBe('https://new.example/a/b?x=1&y=2#frag');
  });

  it('rewrites nested URLs in objects and arrays, leaving other hosts alone', () => {
    const input = {
      theme: {
        light: { logoSmall: 'https://old.example/storage/allpeep/1/l.svg' },
        dark: { logoSmall: 'https://old.example/storage/allpeep/1/d.svg' },
      },
      links: ['https://old.example/a', 'https://cdn.other/b'],
      note: 'unchanged text',
    };

    expect(
      replaceOriginInValue(input, 'old.example', 'http://localhost:5174'),
    ).toEqual({
      theme: {
        light: { logoSmall: 'http://localhost:5174/storage/allpeep/1/l.svg' },
        dark: { logoSmall: 'http://localhost:5174/storage/allpeep/1/d.svg' },
      },
      links: ['http://localhost:5174/a', 'https://cdn.other/b'],
      note: 'unchanged text',
    });
  });

  it('is a no-op when the origin already matches', () => {
    const value = 'http://localhost:5174/storage/allpeep/1/l.svg';
    expect(
      replaceOriginInValue(value, 'localhost', 'http://localhost:5174'),
    ).toBe(value);
  });

  it('leaves non-matching hostnames untouched', () => {
    const value = 'https://cdn.other/storage/x.png';
    expect(
      replaceOriginInValue(value, 'old.example', 'http://localhost:5174'),
    ).toBe(value);
  });

  it('preserves userinfo in the authority', () => {
    expect(
      replaceOriginInValue(
        'https://user:pass@old.example/a',
        'old.example',
        'http://localhost:5174',
      ),
    ).toBe('http://user:pass@localhost:5174/a');
  });
});
