import { describe, expect, it } from 'vitest';
import { sanitizeRedirect } from './sanitizeRedirect';

describe('sanitizeRedirect', () => {
  it('accepts same-origin relative paths, preserving query and hash', () => {
    expect(sanitizeRedirect('/posts/1')).toBe('/posts/1');
    expect(sanitizeRedirect('/posts/1?tab=comments#replies')).toBe(
      '/posts/1?tab=comments#replies',
    );
  });

  it('rejects absolute URLs and other schemes', () => {
    expect(sanitizeRedirect('https://evil.example')).toBeNull();
    expect(sanitizeRedirect('http://evil.example/path')).toBeNull();
    expect(sanitizeRedirect('javascript:alert(1)')).toBeNull();
    expect(sanitizeRedirect('mailto:me@example.com')).toBeNull();
  });

  it('rejects protocol-relative and scheme-relative forms', () => {
    expect(sanitizeRedirect('//evil.example')).toBeNull();
    expect(sanitizeRedirect('//evil.example/path')).toBeNull();
    expect(sanitizeRedirect('/\\evil.example')).toBeNull();
  });

  it('rejects search-only and empty values', () => {
    expect(sanitizeRedirect('?next=/feed')).toBeNull();
    expect(sanitizeRedirect('')).toBeNull();
  });

  it('rejects unparseable input via the catch branch', () => {
    // A leading backslash-slash is not valid URL syntax for the WHATWG
    // parser (unlike the percent-encoded `/%5C…` form, which parses and is
    // accepted verbatim), so this case can only be rejected by the `try`
    // `catch` — pinning the one exit path the other reject-cases never hit.
    expect(sanitizeRedirect('/\\?evil')).toBeNull();
  });

  it('accepts tricky same-origin paths verbatim, without rewrite', () => {
    // The guard intentionally does not decode-normalize or rewrite the
    // returned path: same-origin resolution at navigation time is what keeps
    // these safe (WHATWG URL collapses them to same-origin paths), so a
    // "helpful" normalization added here, or a regressed origin check, is
    // caught by pinning the exact return value.
    expect(sanitizeRedirect('/%5Cevil.example')).toBe('/%5Cevil.example');
    expect(sanitizeRedirect('/..%2f..%2fetc')).toBe('/..%2f..%2fetc');
    expect(sanitizeRedirect('/../../etc/passwd')).toBe('/../../etc/passwd');
  });
});
