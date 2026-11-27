import { describe, expect, it } from 'vitest';
import { handleRegex } from '../../types';
import {
  extractIframeSrcs,
  firstNWords,
  injectIframeSafetyAttrs,
  isExternalLink,
  linkProfileMentions,
  markdownPlainText,
  matchMentionHandles,
  MARKDOWN_HTML_ALLOWED_ATTRS,
  MARKDOWN_HTML_ALLOWED_TAGS,
  minutesToRead,
  preprocessMarkdownSource,
  sanitizeMarkdownHtml,
  stripMarkdownImages,
  toGotoUrl,
  truncateMarkdown,
} from '../markdownHelpers';

const allowedHandles = [
  'alice',
  'Alice',
  'user123',
  '123user',
  'alice_bob',
  '_leading',
  'trailing_',
  'alice-bob',
  'O-Brien',
  '-leading',
  'trailing-',
  'guest-Ab3XyZ',
  'a',
  'abcdefghijklmnop',
];

const rejectedHandles = [
  ["O'Brien", 'apostrophe'],
  ['anna smith', 'space'],
  ['user.name', 'dot'],
  ['user@host', 'at'],
  ['abcdefghijklmnopq', '17 characters'],
  ['', 'empty'],
] as const;

const mentions = [
  { profile: { handle: 'guest-Ab3XyZ', displayName: "O'Brien" } },
  { profile: { handle: 'jose', displayName: 'José' } },
  { profile: { handle: 'alice-bob', displayName: 'Alice' } },
  { profile: { handle: 'ann', displayName: 'Ann' } },
  { profile: { handle: 'annasmith', displayName: 'Anna Smith' } },
];

describe('handleRegex (allowed handles)', () => {
  it.each(allowedHandles)('accepts %s', (handle) => {
    expect(handleRegex.test(handle)).toBe(true);
  });

  it.each(rejectedHandles)('rejects %s (%s)', (handle) => {
    expect(handleRegex.test(handle)).toBe(false);
  });
});

describe('matchMentionHandles', () => {
  it.each(allowedHandles)('extracts @%s', (handle) => {
    expect(matchMentionHandles(`ping @${handle} please`)).toEqual([handle]);
  });

  it.each(['!', '.', ',', '?', ';', ':'])(
    'extracts a hyphenated handle before "%s"',
    (punct) => {
      expect(matchMentionHandles(`see @alice-bob${punct}`)).toEqual([
        'alice-bob',
      ]);
    },
  );

  it('extracts several handles from one message', () => {
    expect(matchMentionHandles('hi @alice @alice_bob @guest-Ab3XyZ')).toEqual([
      'alice',
      'alice_bob',
      'guest-Ab3XyZ',
    ]);
  });

  it('extracts a handle after an opening parenthesis', () => {
    expect(matchMentionHandles('see (@alice more)')).toEqual(['alice']);
  });

  it('does not treat an apostrophe as part of a handle', () => {
    expect(matchMentionHandles("hey @O'Brien")).toEqual([]);
  });

  it('does not extract email addresses', () => {
    expect(matchMentionHandles('a@b.com write @alice')).toEqual(['alice']);
  });

  it('returns an empty list for blank input', () => {
    expect(matchMentionHandles(undefined)).toEqual([]);
    expect(matchMentionHandles(null)).toEqual([]);
    expect(matchMentionHandles('')).toEqual([]);
  });
});

describe('linkProfileMentions', () => {
  it.each(allowedHandles)(
    'links allowed handle @%s without a mentions list',
    (handle) => {
      expect(linkProfileMentions(`hi @${handle}`)).toBe(
        `hi [@${handle}](/@${handle})`,
      );
    },
  );

  it('links a handle that ends with a hyphen', () => {
    expect(linkProfileMentions('see @trailing-')).toBe(
      'see [@trailing-](/@trailing-)',
    );
  });

  it('links a display name that contains an apostrophe', () => {
    expect(linkProfileMentions("hey @O'Brien", mentions)).toBe(
      "hey [@O'Brien](/@guest-Ab3XyZ)",
    );
  });

  it('links unicode display names', () => {
    expect(linkProfileMentions('hi @José', mentions)).toBe(
      'hi [@José](/@jose)',
    );
  });

  it('links a hyphenated handle from the mentions list', () => {
    expect(linkProfileMentions('see @alice-bob later', mentions)).toBe(
      'see [@alice-bob](/@alice-bob) later',
    );
  });

  it('prefers the longest display name', () => {
    expect(linkProfileMentions('ping @Anna Smith', mentions)).toBe(
      'ping [@Anna Smith](/@annasmith)',
    );
  });

  it('does not treat an apostrophe as the end of a shorter name', () => {
    expect(linkProfileMentions("call @O'Brien", mentions)).not.toContain(
      '[@O](/@',
    );
  });

  it('does not rewrite email addresses', () => {
    expect(linkProfileMentions('a@b.com', mentions)).toBe('a@b.com');
  });

  it('is case-insensitive for display names', () => {
    expect(linkProfileMentions("HOWDY @o'brien!", mentions)).toBe(
      "HOWDY [@o'brien](/@guest-Ab3XyZ)!",
    );
  });

  it('does not double-link an already linked mention', () => {
    expect(linkProfileMentions('[@alice](/@alice)', mentions)).toBe(
      '[@alice](/@alice)',
    );
  });
});

describe('preprocessMarkdownSource', () => {
  it('links mentions the same as linkProfileMentions', () => {
    expect(
      preprocessMarkdownSource('hi @alice', [{ profile: { handle: 'alice' } }]),
    ).toBe('hi [@alice](/@alice)');
  });

  it('handles empty source', () => {
    expect(preprocessMarkdownSource('')).toBe('');
    expect(preprocessMarkdownSource('', [])).toBe('');
  });
});

describe('stripMarkdownImages', () => {
  it('removes inline images, keeps surrounding text', () => {
    const out = stripMarkdownImages('Hi ![alt](https://e.com/i.png) bye');
    expect(out).not.toContain('![');
    expect(out).toContain('Hi');
    expect(out).toContain('bye');
  });

  it('removes a linked image, keeps the surrounding text', () => {
    const out = stripMarkdownImages(
      'See [![alt](i.png)](https://e.com) and **bold**',
    );
    expect(out).not.toContain('![');
    expect(out).not.toContain('](i.png)');
    expect(out).toContain('and **bold**');
  });

  it('returns empty for missing input', () => {
    expect(stripMarkdownImages(undefined)).toBe('');
    expect(stripMarkdownImages('')).toBe('');
  });
});

describe('markdownPlainText', () => {
  it('drops heading marks, emphasis, and inline code', () => {
    expect(
      markdownPlainText(
        "Usually I'm also @anca. # This is a headline ## Markdown in bio `leet`",
      ),
    ).toBe("Usually I'm also @anca. This is a headline Markdown in bio leet");
  });

  it('keeps link text and collapses fenced code', () => {
    expect(
      markdownPlainText('see [docs](https://example.com)\n```\ncode\n```'),
    ).toBe('see docs');
  });

  it('returns an empty string for blank input', () => {
    expect(markdownPlainText(undefined)).toBe('');
    expect(markdownPlainText(null)).toBe('');
    expect(markdownPlainText('')).toBe('');
  });
});

describe('firstNWords', () => {
  it('returns the first n words', () => {
    expect(firstNWords('one two three four', 2)).toBe('one two');
  });
});

describe('truncateMarkdown', () => {
  it('preserves punctuation and inline markdown', () => {
    const result = truncateMarkdown(
      'Hello, world! This is a [link](http://x.com) test.',
      1,
      30,
    );
    expect(result).toBe('Hello, world! This is a…');
  });

  it('truncates to first N blocks with ellipsis when more exist', () => {
    const md = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    expect(truncateMarkdown(md, 2, 1000)).toBe(
      'First paragraph.\n\nSecond paragraph.…',
    );
  });

  it('returns content unchanged when within budget and no extra blocks', () => {
    expect(truncateMarkdown('Short content here.', 2, 200)).toBe(
      'Short content here.',
    );
  });

  it('cuts at a word boundary within the character budget', () => {
    const result = truncateMarkdown(
      'This is a very long sentence that exceeds the limit',
      1,
      20,
    );
    expect(result).toBe('This is a very long…');
  });

  it('returns empty string for undefined or empty input', () => {
    expect(truncateMarkdown(undefined, 1, 100)).toBe('');
    expect(truncateMarkdown('', 1, 100)).toBe('');
  });

  it('handles content shorter than maxChars with extra blocks', () => {
    const md = 'Keep this.\n\nAnd this too.';
    expect(truncateMarkdown(md, 1, 200)).toBe('Keep this.…');
  });
});

describe('truncateMarkdown keeps inline markdown valid', () => {
  it('does not sever a markdown link across the cut', () => {
    // plain 'ab ' (3) + link '[d](u)' (6) fit within 9; truncation happens after
    expect(truncateMarkdown('ab [d](u) rest of the line', 1, 9)).toBe(
      'ab [d](u)…',
    );
  });

  it('does not sever an image link, and drops it rather than breaking syntax', () => {
    // The protected span `![a](u)` (7) plus leading 'x ' (2) = 9 ≤ budget; kept whole.
    expect(truncateMarkdown('x ![a](u) tail here', 1, 9)).toBe('x ![a](u)…');
  });

  it('omits a protected span that would not fit whole (no raw link syntax)', () => {
    const result = truncateMarkdown(
      'See [docs](https://example.com/path) here',
      1,
      12,
    );
    expect(result).not.toContain('[');
    expect(result).not.toContain('](');
    expect(result.endsWith('…')).toBe(true);
  });

  it('closes emphasis left open by a word-boundary cut', () => {
    expect(
      truncateMarkdown(
        'some **very long bold text** continues past here',
        1,
        15,
      ),
    ).toBe('some **very**…');
  });

  it('closes single-char emphasis left open by a cut', () => {
    expect(truncateMarkdown('a *bold text here continues', 1, 8)).toBe(
      'a *bold*…',
    );
  });

  it('closes an inline code span left open by a cut', () => {
    expect(truncateMarkdown('a `code span` more text', 1, 8)).toBe('a…');
    expect(truncateMarkdown('ab `code` rest of the world', 1, 9)).toBe(
      'ab `code`…',
    );
  });

  it('treats a line-leading asterisk as a list marker, not emphasis', () => {
    expect(
      truncateMarkdown('* first' + String.fromCharCode(10) + '* second', 1, 9),
    ).toBe('* first…');
  });

  it('still cuts at a word boundary for plain text', () => {
    expect(
      truncateMarkdown(
        'This is a very long sentence that exceeds the limit',
        1,
        20,
      ),
    ).toBe('This is a very long…');
  });
});

describe('minutesToRead', () => {
  const words = (n: number) =>
    Array.from({ length: n }, () => 'word').join(' ');

  it('returns 0 for empty or undefined content', () => {
    expect(minutesToRead(undefined)).toBe(0);
    expect(minutesToRead('')).toBe(0);
    expect(minutesToRead('   ')).toBe(0);
  });

  it('returns at least 1 for non-empty content', () => {
    expect(minutesToRead('hello')).toBe(1);
  });

  it('estimates 1 minute for a short article', () => {
    expect(minutesToRead(words(100))).toBe(1);
  });

  it('estimates ~3 minutes for a 500-word article', () => {
    expect(minutesToRead(words(500))).toBe(3);
  });

  it('strips markdown before counting words', () => {
    const markdown =
      '# Title\n\nThis is [a link](http://x.com) with `code` and **bold**.';
    // markdownPlainText gives: "Title This is a link with code and bold." (9 words)
    expect(minutesToRead(markdown, 3)).toBe(3);
  });
});

describe('isExternalLink', () => {
  const origin = 'https://app.example';

  it('treats same-origin and relative hrefs as internal', () => {
    expect(isExternalLink('/@alice', origin)).toBe(false);
    expect(isExternalLink('/posts/abc', origin)).toBe(false);
    expect(isExternalLink('https://app.example/groups/x', origin)).toBe(false);
  });

  it('treats other origins as external', () => {
    expect(isExternalLink('https://news.example/story', origin)).toBe(true);
    expect(isExternalLink('http://example.com', origin)).toBe(true);
  });

  it('ignores mailto, tel, and hash', () => {
    expect(isExternalLink('mailto:a@b.c', origin)).toBe(false);
    expect(isExternalLink('tel:+1555', origin)).toBe(false);
    expect(isExternalLink('#section', origin)).toBe(false);
  });
});

describe('toGotoUrl', () => {
  const origin = 'https://app.example';

  it('wraps root-relative paths in goto:', () => {
    expect(toGotoUrl('/@alice', origin)).toBe('goto:/@alice');
  });

  it('passes through existing goto: URLs', () => {
    expect(toGotoUrl('goto:/@alice', origin)).toBe('goto:/@alice');
  });

  it('converts same-origin absolute URLs to goto: paths', () => {
    expect(toGotoUrl('https://app.example/groups/x', origin)).toBe(
      'goto:/groups/x',
    );
  });

  it('leaves external URLs unchanged', () => {
    expect(toGotoUrl('https://example.com', origin)).toBe(
      'https://example.com',
    );
  });
});

describe('extractIframeSrcs', () => {
  it('extracts src from a single iframe', () => {
    expect(
      extractIframeSrcs('<iframe src="https://x.com/embed/1"></iframe>'),
    ).toEqual(['https://x.com/embed/1']);
  });

  it('extracts src from multiple iframes', () => {
    const html =
      '<iframe src="https://a.com"></iframe><iframe src="https://b.com"></iframe>';
    expect(extractIframeSrcs(html)).toEqual(['https://a.com', 'https://b.com']);
  });

  it('handles single-quoted attrs', () => {
    expect(extractIframeSrcs("<iframe src='https://x.com'></iframe>")).toEqual([
      'https://x.com',
    ]);
  });

  it('returns empty for no iframes', () => {
    expect(extractIframeSrcs('<p>no iframes here</p>')).toEqual([]);
  });
});

describe('injectIframeSafetyAttrs', () => {
  it('adds loading, sandbox, referrerpolicy, allow, and style to a bare iframe', () => {
    const result = injectIframeSafetyAttrs(
      '<iframe src="https://x.com"></iframe>',
    );
    expect(result).toContain('loading="lazy"');
    expect(result).toContain('sandbox="allow-scripts');
    expect(result).toContain('referrerpolicy');
    expect(result).toContain('allow="autoplay');
    expect(result).toContain('encrypted-media');
    expect(result).toContain('picture-in-picture');
    expect(result).toContain('allow-popups-to-escape-sandbox');
    expect(result).toContain('max-width:100%');
  });

  it('does not duplicate attributes that already exist', () => {
    const result = injectIframeSafetyAttrs(
      '<iframe src="https://x.com" loading="eager" sandbox="allow-scripts"></iframe>',
    );
    // Should not add a second loading attribute
    const loadingCount = (result.match(/loading=/g) || []).length;
    expect(loadingCount).toBe(1);
  });

  it('preserves existing src attribute', () => {
    const result = injectIframeSafetyAttrs(
      '<iframe src="https://example.com/embed"></iframe>',
    );
    expect(result).toContain('src="https://example.com/embed"');
  });

  it('preserves an existing allow attribute when already present', () => {
    const result = injectIframeSafetyAttrs(
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" allow="autoplay; encrypted-media; picture-in-picture"></iframe>',
    );
    const allowCount = (result.match(/allow=/g) || []).length;
    expect(allowCount).toBe(1);
  });

  it('does not duplicate allow attribute when already present', () => {
    const result = injectIframeSafetyAttrs(
      '<iframe src="https://example.com" allow="fullscreen"></iframe>',
    );
    const allowCount = (result.match(/\ballow=/g) || []).length;
    expect(allowCount).toBe(1);
  });

  it('does not add a second allow attribute for allowfullscreen-only iframe', () => {
    const result = injectIframeSafetyAttrs(
      '<iframe src="https://example.com" allowfullscreen></iframe>',
    );
    expect(result).toContain('allow="autoplay');
  });
});

describe('MARKDOWN_HTML_ALLOWED_TAGS/ATTRS', () => {
  it('includes the layout/typographic primitives', () => {
    for (const tag of [
      'div',
      'span',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'figure',
    ]) {
      expect(MARKDOWN_HTML_ALLOWED_TAGS).toContain(tag);
    }
  });

  it('includes the layout attributes', () => {
    for (const attr of ['class', 'colspan', 'rowspan']) {
      expect(MARKDOWN_HTML_ALLOWED_ATTRS).toContain(attr);
    }
  });

  it('still forbids script/style/form', () => {
    expect(MARKDOWN_HTML_ALLOWED_TAGS).not.toContain('script');
    expect(MARKDOWN_HTML_ALLOWED_TAGS).not.toContain('form');
  });
});

describe('sanitizeMarkdownHtml (DOM-free sanitizer)', () => {
  it('keeps allowed tags and class attributes', () => {
    const out = sanitizeMarkdownHtml('<div class="col"><span>hi</span></div>');
    expect(out).toContain('<div class="col">');
    expect(out).toContain('<span>hi</span>');
    expect(out).toContain('</div>');
  });

  it('round-trips a GFM table', () => {
    const table =
      '<table><thead><tr><th>a</th><th>b</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>';
    const out = sanitizeMarkdownHtml(table);
    expect(out).toContain('<table>');
    expect(out).toContain('<thead>');
    expect(out).toContain('<tr><th>a</th><th>b</th></tr>');
    expect(out).toContain('<td>1</td>');
    expect(out).toContain('</table>');
  });

  it('removes <script> and its body', () => {
    const out = sanitizeMarkdownHtml('hello <script>alert(1)</script> world');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(1)');
    expect(out).toContain('hello');
    expect(out).toContain('world');
  });

  it('strips onerror/onclick handlers and javascript: hrefs', () => {
    const out = sanitizeMarkdownHtml(
      '<img src="x" onerror="alert(2)"><a href="javascript:alert(3)" onclick="alert(4)">x</a>',
    );
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('alert');
    expect(out).toContain('<a');
  });

  it('drops disallowed tags (form, object) but keeps their content as text', () => {
    // A `<form>`/`<object>` only loses its tag in a real parser — its
    // content is ordinary markup and stays (the browser keeps the text).
    const out = sanitizeMarkdownHtml('a <form action="x">secret</form> b');
    expect(out).not.toContain('<form');
    expect(out).toContain('secret');
    expect(out).toContain('a');
    expect(out).toContain('b');
  });

  it('keeps a quoted > inside an attribute value', () => {
    const out = sanitizeMarkdownHtml(
      '<a href="https://example.com/?a=1&amp;b=2" title="x > y">link</a>',
    );
    expect(out).toContain('<a');
    expect(out).toContain('link');
  });

  it('returns empty-ish output for script-only input', () => {
    const out = sanitizeMarkdownHtml('<script>alert(1)</script>');
    expect(out.trim()).toBe('');
  });

  it('escapes a bare < as text instead of truncating the document', () => {
    // Regression: the old code aborted on the first unparseable `<` and
    // dropped everything after it.
    const out = sanitizeMarkdownHtml('<div>Column 2 has 3 < 5 inside</div>');
    expect(out).toContain('<div>');
    expect(out).toContain('3 &lt; 5 inside');
    expect(out).toContain('</div>');
    expect(out).not.toContain('3 5 inside');
  });

  it('escapes a lone < followed by a space (a non-tag <)', () => {
    const out = sanitizeMarkdownHtml('a < b and c');
    expect(out).toContain('a &lt; b and c');
  });

  it('keeps scanning after a < that looks like a tag but is not closed', () => {
    const out = sanitizeMarkdownHtml('before < b after');
    expect(out).toContain('before');
    expect(out).toContain('after');
  });

  it('strips an entity-encoded javascript: href (DOMPurify parity)', () => {
    // `&#106;avascript:` and `jav&#x09;ascript:` decode to `javascript:`;
    // DOMPurify strips both, so the DOM-free path must too.
    const out = sanitizeMarkdownHtml(
      '<a href="&#106;avascript:alert(1)">x</a> <a href="jav&#x09;ascript:alert(2)">y</a>',
    );
    expect(out).not.toContain('alert(1)');
    expect(out).not.toContain('alert(2)');
    expect(out).not.toMatch(/href="&#106;avascript/);
    expect(out).not.toMatch(/href="jav&#x09;ascript/);
    expect(out).toContain('x');
    expect(out).toContain('y');
  });

  it('strips named-entity and semicolonless-numeric javascript: hrefs', () => {
    // The HTML5 attribute-value tokenizer also decodes named references and
    // semicolonless numeric ones, so `javascript&colon;alert(1)`,
    // `jav&Tab;ascript:alert(1)` and `java&NewLine;script:alert(1)` are all
    // `javascript:`/`vbscript:` schemes to the browser. DOMPurify 3.4.17
    // strips all four; the DOM-free guard decodes the same set.
    const out = sanitizeMarkdownHtml(
      '<a href="javascript&colon;alert(1)">x</a> ' +
        '<a href="jav&Tab;ascript:alert(2)">y</a> ' +
        '<a href="java&NewLine;script:alert(3)">z</a> ' +
        '<a href="&#106avascript:alert(4)">w</a>',
    );
    expect(out).not.toContain('alert(1)');
    expect(out).not.toContain('alert(2)');
    expect(out).not.toContain('alert(3)');
    expect(out).not.toContain('alert(4)');
    expect(out).not.toMatch(/href="javascript&colon;/i);
    expect(out).not.toMatch(/href="jav&Tab;ascript/);
    expect(out).not.toMatch(/href="java&NewLine;script/);
    expect(out).not.toMatch(/href="&#106;avascript/);
    expect(out).toContain('x');
    expect(out).toContain('y');
    expect(out).toContain('z');
    expect(out).toContain('w');
  });

  it('strips a control-char-obfuscated javascript: href', () => {
    const out = sanitizeMarkdownHtml('<a href="java\tscript:alert(1)">x</a>');
    expect(out).not.toContain('alert(1)');
    expect(out).not.toMatch(/href="java/);
    expect(out).toContain('x');
  });

  it('drops a data: URI on href but keeps an image data: URI on img src', () => {
    // DOMPurify drops data: on href always, and on img src except image/*.
    const out = sanitizeMarkdownHtml(
      '<a href="data:image/png;base64,AAAB">l</a> ' +
        '<img src="data:image/png;base64,AAAB"> ' +
        '<a href="data:text/html,<script>alert(1)</script>">t</a>',
    );
    // href data: (image and text/html) is dropped.
    expect(out).not.toMatch(/href="data:/);
    // img data:image/* is kept.
    expect(out).toContain('src="data:image/png;base64,AAAB"');
    // no script leak from the text/html payload.
    expect(out).not.toContain('alert(1)');
  });

  it('keeps a double-encoded entity that does not spell an executable scheme', () => {
    // `&amp;#106;avascript:` decodes (single pass) to the literal text
    // `&#106;avascript:` — no executable scheme — so it is kept verbatim.
    // This holds for the current decode set (named + numeric, single pass);
    // it is not a general DOMPurify claim (DOMPurify 3.4.17's decode covers a
    // much larger named table than this helper implements).
    const out = sanitizeMarkdownHtml(
      '<a href="&amp;#106;avascript:alert(1)">x</a>',
    );
    expect(out).toContain('href="&amp;#106;avascript:alert(1)"');
    expect(out).toContain('x');
  });

  it('escapes a re-serialized attribute value so it cannot forge a second attribute', () => {
    // Regression (review class-1): `title='x" href="javascript:alert(1)"'`
    // is ONE attribute whose raw value contains `"` characters. Re-emitting
    // that value unescaped into the double-quoted serialization turned it
    // into a live `javascript:` href in email HTML. The value must be
    // entity-escaped (`"` -> &quot;, `&` -> &amp;) so it stays inert text.
    const out = sanitizeMarkdownHtml(
      '<a title=\'x" href="javascript:alert(1)\'>safe text</a>',
    );
    expect(out).toBe(
      '<a title="x&quot; href=&quot;javascript:alert(1)">safe text</a>',
    );
    // no executable href survives the re-serialization
    expect(out).not.toMatch(/href="javascript:/);
  });

  it('keeps a benign quote-containing attribute value, escaped', () => {
    // `title='has "quote" inside'` is harmless: keep the attribute (the
    // quotes escaped) rather than dropping it.
    const out = sanitizeMarkdownHtml(
      '<img title=\'has "quote" inside\' alt="ok" />',
    );
    expect(out).toContain('title="has &quot;quote&quot; inside"');
    expect(out).toContain('alt="ok"');
  });

  it('escapes & in attribute values on re-serialization', () => {
    // `title="R&D"` keeps its attribute with the `&` entity-escaped, matching
    // what DOMPurify emits (a raw `&` would be a malformed entity reference).
    const out = sanitizeMarkdownHtml(
      '<a title="R&D" href="https://x.example">t</a>',
    );
    expect(out).toContain('title="R&amp;D"');
    expect(out).toContain('href="https://x.example"');
  });

  it('does not truncate the document after an unclosed non-raw-text disallowed tag', () => {
    // Regression (review item 3): an unclosed `<form>` (a normal element, not
    // raw-text) keeps its content as text and must not swallow the tail of the
    // document. Pin the exact output so the semantics stay.
    expect(sanitizeMarkdownHtml('KEEP1 <form>x KEEP2')).toBe('KEEP1 x KEEP2');
    expect(sanitizeMarkdownHtml('A <object>x B-TAIL')).toBe('A x B-TAIL');
    expect(sanitizeMarkdownHtml('A <form>x <b>y</b> B-TAIL')).toBe(
      'A x <b>y</b> B-TAIL',
    );
  });

  it('still swallows an unclosed raw-text disallowed tag to end of input', () => {
    // An unclosed `<script>`/`<style>`/`<noscript>` is, in a real parser,
    // content to end-of-document, so the tail is its (dropped) body — this is
    // DOMPurify's behavior, not an error fallback.
    expect(sanitizeMarkdownHtml('KEEP1 <script>x KEEP2')).toBe('KEEP1 ');
    expect(sanitizeMarkdownHtml('KEEP1 <style>x KEEP2')).toBe('KEEP1 ');
    expect(sanitizeMarkdownHtml('KEEP1 <noscript>x KEEP2')).toBe('KEEP1 ');
  });

  it('keeps a double-quoted value containing single quotes verbatim (mirror of the single-quoted pin)', () => {
    // Mirror of the single-quoted class-1 re-serialization pin, for the
    // other serialization family: the attribute is double-quoted in source
    // and its raw value contains SINGLE quotes (`x' href='javascript:alert(2)'
    // — note: a double-quoted HTML value cannot contain `"`, so this is
    // the mirror). No `"` in the value, so the double-quoted
    // serialization keeps it verbatim; it cannot forge a live second
    // attribute (a live one would be `href="javascript:..."`, which never
    // appears). DOMPurify 3.4.17 emits the identical value, so the pin is
    // parity-anchored.
    const out = sanitizeMarkdownHtml(
      "<a title=\"x' href='javascript:alert(2)'\">safe</a>",
    );
    expect(out).toBe("<a title=\"x' href='javascript:alert(2)'\">safe</a>");
    expect(out).not.toMatch(/href="javascript:/);
  });

  it('applies the data: URI policy per tag, matching DOMPurify (media src keeps, non-media drops)', () => {
    // DOMPurify's `data:` special case is tag-based (`DEFAULT_DATA_URI_TAGS`
    // = audio/video/img/source/image/track), NOT a `data:image/*` prefix test
    // and NOT attribute-based: it keeps ANY `data:` payload on a media `src`
    // (a browser does not execute it there) and drops `data:` on `href` and
    // on `src` of a non-media tag such as `iframe`. This mirrors that exactly.
    expect(
      sanitizeMarkdownHtml(
        '<video src="data:text/html,<script>alert(1)</script>"></video>',
      ),
    ).toBe(
      '<video src="data:text/html,&lt;script>alert(1)&lt;/script>"></video>',
    );
    expect(
      sanitizeMarkdownHtml('<source src="data:image/png;base64,AAAB">'),
    ).toBe('<source src="data:image/png;base64,AAAB">');
    // `iframe` is not a media tag and `a` has no `data:` allowance on `href`:
    // both drop the `data:` URI, matching the browser.
    expect(
      sanitizeMarkdownHtml(
        '<iframe src="data:image/svg+xml,&lt;svg onload=x&gt;"></iframe>',
      ),
    ).toBe('<iframe></iframe>');
    expect(sanitizeMarkdownHtml('<a href="data:text/html,x">t</a>')).toBe(
      '<a>t</a>',
    );
  });

  it('drops C0-control-obfuscated javascript: hrefs (vtab, FF) and keeps NUL inert', () => {
    // `&#xB;` (vertical tab) and `&#12;` (form feed) decode to C0 controls
    // that SCHEME_NORMALIZE_RE strips, exposing `javascript:` -> the href is
    // dropped, matching DOMPurify.
    expect(
      sanitizeMarkdownHtml('<a href="jav&#xB;ascript:alert(1)">x</a>'),
    ).toBe('<a>x</a>');
    expect(
      sanitizeMarkdownHtml('<a href="jav&#12;ascript:alert(2)">x</a>'),
    ).toBe('<a>x</a>');
    // `&#0;` (NUL) is deliberately excluded from the single-pass decode
    // (`code > 0`), so the guard cannot see through NUL obfuscation. It keeps
    // the value as inert, re-escaped text rather than decoding it into a live
    // scheme; a browser rendering it also sees a NUL-broken (non-executable)
    // URL, so the payload is dead either way. Pinned so a future decode that
    // starts handling code 0 is a deliberate, visible change.
    expect(
      sanitizeMarkdownHtml('<a href="jav&#0;ascript:alert(1)">x</a>'),
    ).toBe('<a href="jav&amp;#0;ascript:alert(1)">x</a>');
  });

  it('drops an unclosed comment to end of input (accepted approximation)', () => {
    // A `-->` terminator is required. An *unclosed* comment drops the whole
    // remainder of the input — a real parser would keep it as ordinary text
    // running to end of input, so the tail loss is a documented approximation
    // (comments carry no script either way). Pinned like the unclosed-tag
    // tails.
    expect(sanitizeMarkdownHtml('x <!-- unclosed comment y')).toBe('x ');
  });

  it('strips a Unicode-whitespace-obfuscated scheme (full ATTR_WHITESPACE parity)', () => {
    // DOMPurify tests the decoded value with its full `ATTR_WHITESPACE` set
    // removed: NBSP, U+1680, U+180E, U+2000-U+2029, U+205F, U+3000. Any of
    // these splitting `javascript:` must be stripped so the scheme is exposed
    // and the href dropped — previously only `[\u0000-\u0020\u00a0]` was
    // removed, so the non-ASCII half of the set leaked through verbatim on the
    // email path while the browser dropped it.
    for (const ws of [
      '\u2000', // EN QUAD
      '\u1680', // MONGOLIAN VOWEL SEPARATOR
      '\u180e', // ARABIC LETTER MARK
      '\u205f', // MEDIUM MATHEMATICAL SPACE
      '\u3000', // IDEOGRAPHIC SPACE
      '\u2028', // LINE SEPARATOR
    ]) {
      const out = sanitizeMarkdownHtml(
        `<a href="jav${ws}ascript:alert(1)">t</a>`,
      );
      expect(out).toBe('<a>t</a>');
    }
    // NBSP (\u00a0) was already covered by the old range; pin it alongside for
    // a single full-set reference.
    expect(
      sanitizeMarkdownHtml('<a href="jav\u00a0ascript:alert(1)">t</a>'),
    ).toBe('<a>t</a>');
  });

  it('emits a repeated or case-variant attribute only once (first-wins, DOM parity)', () => {
    // A real DOM (and DOMPurify's `setAttribute`) keeps the first-seen value for
    // a repeated or case-variant attribute name; the DOM-free rebuilder must not
    // emit the attribute twice.
    expect(sanitizeMarkdownHtml('<div class="a" CLASS="b">t</div>')).toBe(
      '<div class="a">t</div>',
    );
    expect(sanitizeMarkdownHtml('<td colspan="2" colSpan="3">x</td>')).toBe(
      '<td colspan="2">x</td>',
    );
  });

  it('keeps admitted-scheme and relative hrefs on the DOM-free path (no over-drop)', () => {
    // The new URI guard can only drop an href, never keep a bad one, so the
    // common suite must also pin the allowed classes: an over-broad
    // `IS_ALLOWED_URI` tightening (e.g. silently stripping `mailto:`) would
    // otherwise only be caught by the react parity suite.
    expect(sanitizeMarkdownHtml('<a href="https://example.com">x</a>')).toBe(
      '<a href="https://example.com">x</a>',
    );
    expect(sanitizeMarkdownHtml('<a href="http://example.com">x</a>')).toBe(
      '<a href="http://example.com">x</a>',
    );
    expect(sanitizeMarkdownHtml('<a href="mailto:bob@example.com">x</a>')).toBe(
      '<a href="mailto:bob@example.com">x</a>',
    );
    expect(sanitizeMarkdownHtml('<a href="tel:+15551234567">x</a>')).toBe(
      '<a href="tel:+15551234567">x</a>',
    );
    // relative (no scheme) and same-page anchor both pass the policy.
    expect(sanitizeMarkdownHtml('<a href="/relative/path">x</a>')).toBe(
      '<a href="/relative/path">x</a>',
    );
    expect(sanitizeMarkdownHtml('<a href="#section-2">x</a>')).toBe(
      '<a href="#section-2">x</a>',
    );
  });
});
