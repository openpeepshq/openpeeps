import { describe, expect, it } from 'vitest';
import { compileMarkdownToHtml } from './compileMarkdown';

// In the react test environment (`environment: 'node'`), DOMPurify.sanitize is
// not a function, so compileMarkdownToHtml takes the DOM-free
// `sanitizeMarkdownHtml` branch — the same branch server-rendered email
// embeds use. These tests pin that branch's output: hand-authored layout HTML
// survives, GFM tables render, and dangerous content is stripped.

describe('compileMarkdownToHtml (DOM-free / email branch)', () => {
  it('keeps a hand-authored two-column flex layout with class attributes', () => {
    const md = [
      '<div class="flex gap-4">',
      '  <div class="col">Left column text</div>',
      '  <div class="col bg-primary">Right column text</div>',
      '</div>',
    ].join('\n');
    const html = compileMarkdownToHtml(md);
    expect(html).toContain('<div');
    expect(html).toContain('class="flex gap-4"');
    expect(html).toContain('Left column text');
    expect(html).toContain('Right column text');
    // class attribute survives on an allowed container tag.
    expect(html).toMatch(/class="col[^"]*"/);
  });

  it('renders a GFM pipe table as an HTML table', () => {
    const md = ['| Name | Count |', '| ---- | ----- |', '| a | 1 |'].join('\n');
    const html = compileMarkdownToHtml(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<thead>');
    expect(html).toContain('<th>Name</th>');
    expect(html).toContain('<td>1</td>');
    expect(html).toContain('</table>');
  });

  it('never lets <script> or event handlers reach the email HTML', () => {
    const md = ['hello', '<script>alert(1)</script>', 'world'].join('\n');
    const html = compileMarkdownToHtml(md);
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
    expect(html).toContain('hello');
    expect(html).toContain('world');
  });

  it('strips onerror handlers from images in the email HTML', () => {
    const html = compileMarkdownToHtml('x <img src="x" onerror="alert(2)"> y');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('alert(2)');
  });

  it('does not sanitize when sanitize: false', () => {
    const html = compileMarkdownToHtml('<script>alert(1)</script>', {
      sanitize: false,
    });
    expect(html).toContain('<script>');
  });
});
