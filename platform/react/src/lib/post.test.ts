import { describe, expect, it } from 'vitest';
import type {
  MediaAttachmentData,
  PostCreationData,
  PostDataUnion,
  Question,
} from '@openpeepshq/common';
import { toNote, toQuestion } from './post';

const attachment: MediaAttachmentData = {
  type: 'image',
  url: 'https://example.com/image.png',
  previewUrl: null,
  textUrl: null,
  filename: 'image.png',
  meta: {},
};

const note = (
  content: string,
  attachments?: MediaAttachmentData[],
): PostCreationData => ({
  type: 'note',
  visibility: 'public',
  data: { type: 'note', content, attachments },
  inReplyToId: '01970000-0000-7000-8000-000000000001',
  mentions: [],
});

const asQuestion = (data: PostDataUnion): Question => {
  if (data.type !== 'question') {
    throw new Error(`expected question data, got ${data.type}`);
  }
  return data;
};

describe('toQuestion', () => {
  it('keeps the typed text as the poll question', () => {
    const data = asQuestion(toQuestion(note('what should we build?')).data);
    expect(data.content).toBe('what should we build?');
  });

  it('keeps note attachments', () => {
    const data = asQuestion(toQuestion(note('pick one', [attachment])).data);
    expect(data.attachments).toEqual([attachment]);
  });

  it('starts with two empty options and a 30-day expiry', () => {
    const data = asQuestion(toQuestion(note('')).data);
    expect(data.options).toEqual([
      { type: 'note', content: '' },
      { type: 'note', content: '' },
    ]);
    const days =
      (new Date(data.expiresAt ?? '').getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThanOrEqual(30);
  });

  it('keeps top-level draft fields', () => {
    const out = toQuestion(note('hi'));
    expect(out.type).toBe('question');
    expect(out.visibility).toBe('public');
    expect(out.inReplyToId).toBe('01970000-0000-7000-8000-000000000001');
    expect(out.mentions).toEqual([]);
  });
});

describe('toNote', () => {
  it('keeps content and attachments, drops poll-only fields', () => {
    const poll = toQuestion(note('pick one', [attachment]));
    const data = toNote(poll).data;
    expect(data.type).toBe('note');
    if (data.type !== 'note') throw new Error('not a note');
    expect(data.content).toBe('pick one');
    expect(data.attachments).toEqual([attachment]);
    expect('options' in data).toBe(false);
    expect('expiresAt' in data).toBe(false);
  });

  it('survives a note -> poll -> note round trip', () => {
    const data = toNote(toQuestion(note('round trip', [attachment]))).data;
    if (data.type !== 'note') throw new Error('not a note');
    expect(data.content).toBe('round trip');
    expect(data.attachments).toEqual([attachment]);
  });
});
