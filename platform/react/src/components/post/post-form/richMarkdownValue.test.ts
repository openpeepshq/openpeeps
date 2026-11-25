import { describe, expect, it } from 'vitest';
import { nextRichMarkdownValue } from './richMarkdownValue';

describe('nextRichMarkdownValue', () => {
  it('ignores the editor normalizing markdown on mount', () => {
    expect(nextRichMarkdownValue('Hello', 'Hello\n', 100, true)).toBeNull();
  });

  it('ignores a change that does not alter the stored markdown', () => {
    expect(nextRichMarkdownValue('Hello', 'Hello', 100, false)).toBeNull();
  });

  it('keeps a real edit inside the character budget', () => {
    expect(nextRichMarkdownValue('Hello', 'Hello!', 100, false)).toBe('Hello!');
  });

  it('refuses growth past the character budget', () => {
    expect(nextRichMarkdownValue('Hello', 'Hello!', 5, false)).toBeNull();
  });

  it('allows shortening a document that is already over the budget', () => {
    expect(nextRichMarkdownValue('Hello!', 'Hello', 5, false)).toBe('Hello');
  });

  it('accepts a long link whose visible text fits the budget (raw does not)', () => {
    // raw is 36 chars; visible is just "label" (5). The budget is judged on
    // visible text, so the round-trip is not refused.
    expect(
      nextRichMarkdownValue(
        'hi',
        '[label](https://example.com/very-long-url)',
        5,
        false,
      ),
    ).toBe('[label](https://example.com/very-long-url)');
  });

  it('refuses growth past the visible-text budget', () => {
    // visible "hello world" (11) is over budget even though the edit is a
    // plain (non-link) string.
    expect(nextRichMarkdownValue('hi', 'hello world', 5, false)).toBeNull();
  });
});
