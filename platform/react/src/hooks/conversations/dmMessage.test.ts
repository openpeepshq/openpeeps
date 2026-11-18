import { describe, expect, it } from 'vitest';
import { POST_MAX_VISIBLE_LENGTH } from '@openpeepshq/common';
import type { MediaAttachmentData } from '@openpeepshq/common/types';
import {
  canSendDmMessage,
  DM_MAX_ATTACHMENTS,
  DM_MESSAGE_MAX_LENGTH,
} from './dmMessage';

// canSendDmMessage only reads `attachments.length`, so a minimal cast keeps
// the test free of constructing a full media attachment.
const attachment = (): MediaAttachmentData =>
  ({}) as unknown as MediaAttachmentData;

const base = {
  sending: false,
  uploadsPending: false,
  attachments: [] as MediaAttachmentData[],
};

describe('DM_MESSAGE_MAX_LENGTH', () => {
  it('stays locked to the shared note budget', () => {
    expect(DM_MESSAGE_MAX_LENGTH).toBe(POST_MAX_VISIBLE_LENGTH);
  });
});

describe('canSendDmMessage', () => {
  it('allows a normal message', () => {
    expect(canSendDmMessage({ ...base, text: 'hello' })).toBe(true);
  });

  it('blocks while a send is in flight', () => {
    expect(canSendDmMessage({ ...base, text: 'hello', sending: true })).toBe(
      false,
    );
  });

  it('blocks while an upload is pending', () => {
    expect(
      canSendDmMessage({
        ...base,
        text: 'hello',
        uploadsPending: true,
      }),
    ).toBe(false);
  });

  it('blocks empty/whitespace-only text with no attachments', () => {
    expect(canSendDmMessage({ ...base, text: '' })).toBe(false);
    expect(canSendDmMessage({ ...base, text: '   ' })).toBe(false);
  });

  it('allows attachment-only messages (no text)', () => {
    expect(
      canSendDmMessage({ ...base, text: '', attachments: [attachment()] }),
    ).toBe(true);
  });

  it('blocks past the visible-text budget', () => {
    expect(
      canSendDmMessage({
        ...base,
        text: 'a'.repeat(POST_MAX_VISIBLE_LENGTH + 1),
      }),
    ).toBe(false);
  });

  it('allows text exactly at the visible-text budget', () => {
    expect(
      canSendDmMessage({ ...base, text: 'a'.repeat(POST_MAX_VISIBLE_LENGTH) }),
    ).toBe(true);
  });

  it('measures visible text, not raw markdown source', () => {
    // A long URL inside a markdown link does not count toward the budget.
    const url = 'https://example.com/'.padEnd(600, 'a') + 'path';
    const text = `check this [out](${url})`;
    expect(text.length).toBeGreaterThan(POST_MAX_VISIBLE_LENGTH);
    expect(canSendDmMessage({ ...base, text })).toBe(true);
  });
});

describe('DM_MAX_ATTACHMENTS', () => {
  it('keeps the shared per-message cap', () => {
    expect(DM_MAX_ATTACHMENTS).toBe(4);
  });
});
