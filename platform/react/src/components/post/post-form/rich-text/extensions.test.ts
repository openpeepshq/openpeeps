// @vitest-environment jsdom

import { Editor } from '@tiptap/react';
import { describe, expect, it } from 'vitest';
import { richTextExtensions } from './extensions';

const markdownFrom = (source: string) => {
  const editor = new Editor({
    extensions: richTextExtensions(''),
    content: source,
    contentType: 'markdown',
  });
  const markdown = editor.getMarkdown().replace(/\n+$/, '');
  editor.destroy();
  return markdown;
};

describe('rich text markdown', () => {
  it('round-trips emphasis, headings, lists, links, quotes, and code', () => {
    const source = [
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
    ].join('\n');

    expect(markdownFrom(source)).toBe(source);
  });

  it('drops underline because the theme owns text style', () => {
    const editor = new Editor({
      extensions: richTextExtensions(''),
      content: '<p><u>styled</u></p>',
    });
    expect(editor.getMarkdown()).not.toContain('<u>');
    expect(editor.getMarkdown()).toContain('styled');
    editor.destroy();
  });
});
