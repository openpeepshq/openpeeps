import { describe, expect, it } from '@jest/globals';
import { applyMarkdownFormat, type TextSelection } from './markdownFormat';

const cursor = (at: number): TextSelection => ({ start: at, end: at });

describe('applyMarkdownFormat', () => {
  it('wraps the selection with bold markers', () => {
    expect(
      applyMarkdownFormat('hello world', { start: 6, end: 11 }, 'bold', 'link')
    ).toEqual({ value: 'hello **world**', selection: { start: 15, end: 15 } });
  });

  it('places the cursor between the wrap markers when nothing is selected', () => {
    expect(applyMarkdownFormat('hello ', cursor(6), 'italic', 'link')).toEqual({
      value: 'hello **',
      selection: { start: 7, end: 7 },
    });
    // An empty selection keeps both wrap markers adjacent; the caret lands
    // after the first one so typing fills the empty emphasis.
    expect(applyMarkdownFormat('hello ', cursor(6), 'code', 'link')).toEqual({
      value: 'hello ``',
      selection: { start: 7, end: 7 },
    });
  });

  it('toggles a heading off when the line already carries the prefix', () => {
    expect(
      applyMarkdownFormat('## done', cursor(3), 'heading', 'link')
    ).toEqual({ value: '## done', selection: { start: 3, end: 3 } });
  });

  it('prefixes the current line for line-level formats', () => {
    expect(
      applyMarkdownFormat('first\nsecond', cursor(9), 'list', 'link')
    ).toEqual({ value: 'first\n- second', selection: { start: 11, end: 11 } });
    expect(
      applyMarkdownFormat('first\nsecond', cursor(9), 'quote', 'link')
    ).toEqual({ value: 'first\n> second', selection: { start: 11, end: 11 } });
  });

  it('inserts a link with the selected text as label', () => {
    expect(
      applyMarkdownFormat('see here', { start: 4, end: 8 }, 'link', 'link')
    ).toEqual({
      value: 'see [here](https://)',
      selection: { start: 20, end: 20 },
    });
  });

  it('uses a selected URL as the href and the label fallback as text', () => {
    expect(
      applyMarkdownFormat(
        'go to https://example.com now',
        { start: 6, end: 25 },
        'link',
        'link'
      )
    ).toEqual({
      value: 'go to [link](https://example.com) now',
      selection: { start: 33, end: 33 },
    });
  });

  it('clamps an out-of-range selection to the value bounds', () => {
    expect(
      applyMarkdownFormat('hi', { start: 0, end: 99 }, 'bold', 'link')
    ).toEqual({ value: '**hi**', selection: { start: 6, end: 6 } });
    expect(
      applyMarkdownFormat('hi', { start: -5, end: 1 }, 'bold', 'link')
    ).toEqual({ value: '**h**i', selection: { start: 5, end: 5 } });
  });
});
