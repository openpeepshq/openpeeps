import { describe, expect, it } from 'vitest';
import { postDataInputUnionSchema, postDataUnionSchema } from '../../types';
import {
  canSubmitPostContent,
  postContentWithinBudget,
  visibleTextLength,
} from '../contentLength';

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
    [
      'asterisks are stripped, whitespace collapses, in-word underscores kept',
      'a_b * c',
      5,
    ],
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
    ['a table counts only its cell text', '| 1 | 2 |\n| - | - |\n| 3 | 4 |', 7],
    ['a delimiter row renders nothing', '| - | - |', 0],
    ['a setext underline renders nothing', 'Title\n---', 5],
    ['a thematic break renders nothing', 'above\n***\nbelow', 11],
    ['a lone list marker renders nothing', '-', 0],
    ['dashes between words are kept', 'hello --- world', 15],
    ['list markers are dropped', '- milk\n- eggs', 9],
    ['ordered list markers are dropped', '1. first\n2. second', 12],
    ['a negative table cell keeps its sign', '| -1 |', 2],
    ['astral characters count once each', 'hi 👍🏽', 5],
  ])('counts %s as %i', (_name, input, expected) => {
    expect(visibleTextLength(input)).toBe(expected);
  });

  it('returns 0 for empty input', () => {
    expect(visibleTextLength(undefined)).toBe(0);
    expect(visibleTextLength(null)).toBe(0);
    expect(visibleTextLength('')).toBe(0);
  });

  it('measures whitespace-only content as empty', () => {
    expect(visibleTextLength('   ')).toBe(0);
    expect(visibleTextLength('  \n \n  ')).toBe(0);
    expect(visibleTextLength('\t\t')).toBe(0);
  });

  it('collapses whitespace runs like the renderer', () => {
    expect(visibleTextLength('hello    world')).toBe(11);
    expect(visibleTextLength('  padded  ')).toBe(6);
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

  it('does not mistake a stray NUL in the content for the fence sentinel', () => {
    // 500 NULs alone would otherwise satisfy the \u0000(\d+)\u0000 restore
    // pattern shape and swap in fence content that is not there.
    const nuls = '\u0000'.repeat(500);
    expect(visibleTextLength(nuls + 'hello')).toBe(5);
  });
});

describe('postDataInputUnionSchema content budgets', () => {
  it('rejects a note over the visible limit', () => {
    const result = postDataInputUnionSchema.safeParse({
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
    const result = postDataInputUnionSchema.safeParse({
      type: 'note',
      content: '[see](https://example.com/' + 'y'.repeat(490) + ')',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a question over the visible limit', () => {
    const result = postDataInputUnionSchema.safeParse({
      type: 'question',
      content: 'x'.repeat(501),
      options: [{ content: 'yes', type: 'note' }],
    });
    expect(result.success).toBe(false);
  });

  it('leaves articles exempt from the visible limit', () => {
    const result = postDataInputUnionSchema.safeParse({
      type: 'article',
      content: 'x'.repeat(600),
    });
    expect(result.success).toBe(true);
  });

  it('rejects a note with neither visible content nor attachments', () => {
    const result = postDataInputUnionSchema.safeParse({
      type: 'note',
      content: '   ',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]).toMatchObject({
        message: 'posts.form.contentRequired',
        path: ['content'],
      });
    }
  });

  it('accepts an attachment-only note without visible content', () => {
    const result = postDataInputUnionSchema.safeParse({
      type: 'note',
      attachments: [
        {
          type: 'image',
          url: 'https://example.com/cat.png',
          previewUrl: null,
          textUrl: null,
          filename: 'cat.png',
          meta: {},
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  // The response-facing union validates API output, where contentless
  // notes are legitimate: repost shells and system "left" notes carry
  // neither content nor attachments and must not be rejected.
  it('leaves the response-facing union untouched by the refines', () => {
    expect(
      postDataUnionSchema.safeParse({ type: 'note', content: '' }).success,
    ).toBe(true);
    expect(
      postDataUnionSchema.safeParse({ type: 'note', content: 'x'.repeat(501) })
        .success,
    ).toBe(true);
  });
});

describe('canSubmitPostContent', () => {
  it('accepts a note at exactly the budget, with or without attachments', () => {
    const at = { visibleContentLength: 500, attachmentsLength: 0 };
    expect(canSubmitPostContent({ ...at, composerType: 'note' })).toBe(true);
    expect(
      canSubmitPostContent({
        ...at,
        attachmentsLength: 1,
        composerType: 'note',
      }),
    ).toBe(true);
  });

  it('rejects a note one character over the budget even with attachments', () => {
    expect(
      canSubmitPostContent({
        visibleContentLength: 501,
        attachmentsLength: 2,
        composerType: 'note',
      }),
    ).toBe(false);
  });

  it('accepts an attachment-only note (no visible text) as a note', () => {
    expect(
      canSubmitPostContent({
        visibleContentLength: 0,
        attachmentsLength: 1,
        composerType: 'note',
      }),
    ).toBe(true);
  });

  it('requires visible text from a question, ignoring attachments', () => {
    expect(
      canSubmitPostContent({
        visibleContentLength: 0,
        attachmentsLength: 1,
        composerType: 'question',
      }),
    ).toBe(false);
    expect(
      canSubmitPostContent({
        visibleContentLength: 3,
        attachmentsLength: 0,
        composerType: 'question',
      }),
    ).toBe(true);
  });

  it('rejects a question whose poll options are invalid', () => {
    expect(
      canSubmitPostContent({
        visibleContentLength: 3,
        attachmentsLength: 0,
        composerType: 'question',
        pollOptionsValid: false,
      }),
    ).toBe(false);
  });

  it('rejects anything over the budget regardless of composer type', () => {
    const over = {
      visibleContentLength: 501,
      attachmentsLength: 1,
      composerType: 'question' as const,
    };
    expect(canSubmitPostContent(over)).toBe(false);
  });
});
