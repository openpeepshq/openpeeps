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
  minutesToRead,
  preprocessMarkdownSource,
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
