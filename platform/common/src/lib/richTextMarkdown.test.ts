import { describe, expect, it } from 'vitest';
import {
  richTextJsonToMarkdown,
  richTextNeedsSourceMode,
  safeRichTextHref,
} from './richTextMarkdown';

describe('richTextJsonToMarkdown', () => {
  it('serializes the article formatting subset', () => {
    const markdown = richTextJsonToMarkdown({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Saturday' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Bring a ' },
            { type: 'text', text: 'tote', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' to the ' },
            {
              type: 'text',
              text: 'market',
              marks: [
                { type: 'link', attrs: { href: 'https://allpeep.com/' } },
              ],
            },
            { type: 'text', text: '.' },
          ],
        },
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'First come.' }],
            },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Baked goods' }],
                },
              ],
            },
          ],
        },
        {
          type: 'codeBlock',
          content: [{ type: 'text', text: "const greeting = 'hello';" }],
        },
        { type: 'horizontalRule' },
      ],
    });

    expect(markdown).toBe(
      [
        '## Saturday',
        '',
        'Bring a **tote** to the [market](https://allpeep.com/).',
        '',
        '> First come.',
        '',
        '- Baked goods',
        '',
        '```',
        "const greeting = 'hello';",
        '```',
        '',
        '---',
      ].join('\n'),
    );
  });

  it('treats an empty document as an empty string', () => {
    expect(
      richTextJsonToMarkdown({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      }),
    ).toBe('');
  });
});

describe('safeRichTextHref', () => {
  it('allows http, https, mailto, and site paths', () => {
    expect(safeRichTextHref('https://allpeep.com/about')).toBe(
      'https://allpeep.com/about',
    );
    expect(safeRichTextHref('/tags/welcome')).toBe('/tags/welcome');
    expect(safeRichTextHref('')).toBe('');
  });

  it('rejects script and data urls', () => {
    expect(safeRichTextHref('javascript:alert(1)')).toBeNull();
    expect(safeRichTextHref('data:text/html,hi')).toBeNull();
  });
});

describe('richTextNeedsSourceMode', () => {
  it('keeps embeds in the source field', () => {
    expect(richTextNeedsSourceMode('<iframe src="https://example.com">')).toBe(
      true,
    );
    expect(richTextNeedsSourceMode('Hello **there**')).toBe(false);
    expect(
      richTextNeedsSourceMode('```\ncode\n```', { fencedCode: true }),
    ).toBe(true);
  });
});
