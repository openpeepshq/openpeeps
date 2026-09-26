import { describe, expect, it } from 'vitest';
import { handleRegex } from '../../types';
import {
  firstNWords,
  linkProfileMentions,
  markdownPlainText,
  matchMentionHandles,
  minutesToRead,
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
