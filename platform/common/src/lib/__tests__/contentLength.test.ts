import { describe, expect, it } from 'vitest';
import { postDataUnionSchema } from '../../types';
import { postContentWithinBudget, visibleTextLength } from '../contentLength';

describe('visibleTextLength', () => {
  it.each([
    ['plain text', 'plain text', 10],
    [
      'a link counts its text, not the URL',
      '[AllPeeP](https://allpeep.com)',
      7,
    ],
    ['an image counts its alt text', '![cat](url)', 3],
    ['a link URL with nested parens', '[x](https://e.com/a_(b))', 1],
    ['asterisks are stripped, in-word underscores kept', 'a_b * c', 6],
    ['HTML tags are dropped', '<b>hi</b>', 2],
    ['an autolink counts the URL itself', '<https://allpeep.com>', 19],
    [
      'fenced code counts its content, not the fence lines',
      '```js\nconst a = 1\n```',
      12,
    ],
    ['inline code counts its content', '`code`', 4],
    ['snake_case is kept', 'snake_case', 10],
    ['heading markers are dropped', '# Hello', 5],
    ['blockquote markers are dropped', '> quote', 5],
    ['emphasis and strikethrough markers are dropped', '**b** *i* ~~s~~', 5],
    ['underscore emphasis at word boundaries is dropped', 'an _em_ phrase', 12],
    ['reference links count the text', '[text][ref]', 4],
  ])('counts %s as %i', (_name, input, expected) => {
    expect(visibleTextLength(input)).toBe(expected);
  });

  it('returns 0 for empty input', () => {
    expect(visibleTextLength(undefined)).toBe(0);
    expect(visibleTextLength(null)).toBe(0);
    expect(visibleTextLength('')).toBe(0);
  });
});

describe('postContentWithinBudget', () => {
  it('accepts content at the visible limit', () => {
    expect(postContentWithinBudget('x'.repeat(500))).toBe(true);
  });

  it('rejects content over the visible limit', () => {
    expect(postContentWithinBudget('x'.repeat(501))).toBe(false);
  });

  it('accepts blank content', () => {
    expect(postContentWithinBudget(null)).toBe(true);
    expect(postContentWithinBudget(undefined)).toBe(true);
  });

  it('accepts a long link URL whose visible text fits the budget', () => {
    const content = '[see](https://example.com/' + 'y'.repeat(490) + ')';
    expect(content.length).toBeGreaterThan(500);
    expect(visibleTextLength(content)).toBe(3);
    expect(postContentWithinBudget(content)).toBe(true);
  });

  it('rejects content over the raw cap even with short visible text', () => {
    expect(postContentWithinBudget('[x](' + 'y'.repeat(4995) + ')')).toBe(true);
    expect(postContentWithinBudget('[x](' + 'y'.repeat(4996) + ')')).toBe(
      false,
    );
  });
});

describe('postDataUnionSchema content budgets', () => {
  it('rejects a note over the visible limit', () => {
    const result = postDataUnionSchema.safeParse({
      type: 'note',
      content: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        message: 'posts.form.contentTooLong',
        path: ['content'],
      });
    }
  });

  it('accepts a note whose raw markdown exceeds 500 but visible text does not', () => {
    const result = postDataUnionSchema.safeParse({
      type: 'note',
      content: '[see](https://example.com/' + 'y'.repeat(490) + ')',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a question over the visible limit', () => {
    const result = postDataUnionSchema.safeParse({
      type: 'question',
      content: 'x'.repeat(501),
      options: [{ content: 'yes', type: 'note' }],
    });
    expect(result.success).toBe(false);
  });

  it('leaves articles exempt from the visible limit', () => {
    const result = postDataUnionSchema.safeParse({
      type: 'article',
      content: 'x'.repeat(600),
    });
    expect(result.success).toBe(true);
  });
});
