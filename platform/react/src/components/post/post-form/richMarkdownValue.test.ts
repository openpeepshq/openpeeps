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
});
