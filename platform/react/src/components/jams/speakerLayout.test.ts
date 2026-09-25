import { describe, expect, it } from 'vitest';
import {
  enlargedIdentity,
  parseSpotlightPayload,
  senderMaySpotlight,
  type LocalSpeakerFocus,
} from './speakerLayout';

const present = new Set(['a', 'b', 'c']);

describe('enlargedIdentity', () => {
  it('follows a host spotlight until the attendee chooses otherwise', () => {
    const focus: LocalSpeakerFocus = { mode: 'follow' };
    expect(enlargedIdentity(focus, 'b', present)).toBe('b');
    expect(enlargedIdentity(focus, null, present)).toBeNull();
  });

  it('keeps a local pin ahead of the room spotlight', () => {
    expect(enlargedIdentity({ mode: 'pin', identity: 'a' }, 'b', present)).toBe(
      'a',
    );
  });

  it('lets an attendee return to the grid without clearing the spotlight', () => {
    expect(enlargedIdentity({ mode: 'grid' }, 'b', present)).toBeNull();
  });

  it('drops a pin or spotlight once that participant leaves', () => {
    expect(
      enlargedIdentity({ mode: 'pin', identity: 'gone' }, 'b', present),
    ).toBeNull();
    expect(enlargedIdentity({ mode: 'follow' }, 'gone', present)).toBeNull();
  });
});

describe('senderMaySpotlight', () => {
  it('allows the jam creator and jam moderators only', () => {
    expect(senderMaySpotlight('creator', 'creator', ['mod'])).toBe(true);
    expect(senderMaySpotlight('mod', 'creator', ['mod'])).toBe(true);
    expect(senderMaySpotlight('guest', 'creator', ['mod'])).toBe(false);
    expect(senderMaySpotlight(undefined, 'creator', ['mod'])).toBe(false);
  });
});

describe('parseSpotlightPayload', () => {
  const encode = (value: unknown) =>
    new TextEncoder().encode(JSON.stringify(value));

  it('reads a spotlight identity and an explicit clear', () => {
    expect(parseSpotlightPayload(encode({ identity: 'abc' }))).toBe('abc');
    expect(parseSpotlightPayload(encode({ identity: null }))).toBeNull();
  });

  it('ignores malformed payloads', () => {
    expect(parseSpotlightPayload(encode({ identity: '' }))).toBeUndefined();
    expect(parseSpotlightPayload(new TextEncoder().encode('nope'))).toBe(
      undefined,
    );
  });
});
