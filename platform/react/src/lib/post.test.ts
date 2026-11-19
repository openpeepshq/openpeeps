import { describe, expect, it } from 'vitest';
import type {
  Article,
  Event,
  MediaAttachmentData,
  Note,
  PostCreationData,
  PostDataUnion,
  Question,
  ResourcePost,
} from '@openpeepshq/common';
import { isSwitchablePostData, toNote, toQuestion } from './post';

const attachment: MediaAttachmentData = {
  type: 'image',
  url: 'https://example.com/image.png',
  previewUrl: null,
  textUrl: null,
  filename: 'image.png',
  meta: {},
};

// The helpers take note/question drafts only, so the fixtures are typed as
// the narrowed SwitchablePostData shape, not the wide PostCreationData.
const note = (
  content: string,
  attachments?: MediaAttachmentData[],
): PostCreationData & { data: Note } => ({
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

const draftBase = {
  visibility: 'public' as const,
  inReplyToId: '01970000-0000-7000-8000-000000000001',
  mentions: [] as [],
};

const article = (title: string): PostCreationData & { data: Article } => ({
  ...draftBase,
  type: 'article',
  data: { type: 'article', content: '', title },
});

const event = (start: string): PostCreationData & { data: Event } => ({
  ...draftBase,
  type: 'event',
  data: { type: 'event', content: '', wholeDay: false, start },
});

const resource = (): PostCreationData & { data: ResourcePost } => ({
  ...draftBase,
  type: 'resource',
  data: {
    type: 'resource',
    content: '',
    title: 'A resource',
    resourceKind: 'link',
  },
});

describe('isSwitchablePostData', () => {
  it('is true for note and question drafts, false otherwise', () => {
    expect(isSwitchablePostData(note('a note'))).toBe(true);
    expect(isSwitchablePostData(toQuestion(note('a question')))).toBe(true);
    expect(isSwitchablePostData(article('an article'))).toBe(false);
    expect(isSwitchablePostData(event('2026-11-19T09:00:00Z'))).toBe(false);
    expect(isSwitchablePostData(resource())).toBe(false);
    // data: undefined is a runtime shape the guard must not crash on; the
    // cast stands in for the missing field the type does not model.
    expect(
      isSwitchablePostData({
        ...draftBase,
        type: 'note',
        data: undefined,
      } as PostCreationData),
    ).toBe(false);
  });
});

describe('toQuestion', () => {
  it('keeps the typed text as the poll question', () => {
    const data = asQuestion(toQuestion(note('what should we build?')).data);
    expect(data.content).toBe('what should we build?');
  });

  it('drops note attachments when converting to a poll', () => {
    // A poll can't display media, so attachments are intentionally dropped
    // (they are gone for good on a later note -> poll -> note round trip).
    const data = asQuestion(toQuestion(note('pick one', [attachment])).data);
    expect(data.attachments).toBeUndefined();
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
  it('keeps note attachments and stashes poll-only fields when converting a poll', () => {
    // toQuestion drops attachments, so a poll converted from a note has none;
    // toNote must not invent them back. The poll-only fields are stashed on
    // `questionDraft` so the reverse switch can restore them.
    const poll = toQuestion(note('pick one', [attachment]));
    const out = toNote(poll);
    const data = out.data;
    expect(data.type).toBe('note');
    if (data.type !== 'note') throw new Error('not a note');
    expect(data.content).toBe('pick one');
    expect(data.attachments).toBeUndefined();
    expect('options' in data).toBe(false);
    expect('expiresAt' in data).toBe(false);
    // the stash carries the poll's structural fields, not its question text
    expect(out.questionDraft?.content).toBeUndefined();
    expect(out.questionDraft?.options).toHaveLength(2);
    expect(out.questionDraft?.expiresAt).toBeTruthy();
  });

  it('keeps note attachments when converting a note to a note', () => {
    const out = toNote(note('hello', [attachment]));
    const data = out.data;
    if (data.type !== 'note') throw new Error('not a note');
    expect(data.content).toBe('hello');
    expect(data.attachments).toEqual([attachment]);
    // a note draft carries no poll stash
    expect(out.questionDraft).toBeUndefined();
  });

  it('survives a note -> poll -> note round trip', () => {
    // Deliberate: attachments are dropped when the draft becomes a poll
    // (switching to a type that cannot display media discards it), so they
    // are gone once the draft switches back to a note.
    const data = toNote(toQuestion(note('round trip', [attachment]))).data;
    if (data.type !== 'note') throw new Error('not a note');
    expect(data.content).toBe('round trip');
    expect(data.attachments).toBeUndefined();
  });
});

describe('poll -> note -> poll restore', () => {
  // A half-typed poll keeps its options, expiry and flags when the user
  // switches to a note (e.g. to reconsider the wording) and back.
  const typedQuestion = (): PostCreationData & { data: Question } => {
    const q = toQuestion(note('which one?'));
    const qd = q.data as Question;
    return {
      ...q,
      data: {
        ...qd,
        options: [
          { type: 'note', content: 'option a' },
          { type: 'note', content: 'option b' },
          { type: 'note', content: 'option c' },
        ],
        expiresAt: '2026-12-25T12:00:00.000Z',
        multiple: true,
        votersVisible: false,
      },
    };
  };

  it('restores options, expiry, multiple and votersVisible on the reverse switch', () => {
    const poll = typedQuestion();
    const noteDraft = toNote(poll);
    expect(noteDraft.data.type).toBe('note');
    expect(noteDraft.data.content).toBe('which one?');

    const back = toQuestion(noteDraft);
    expect(back.questionDraft).toBeUndefined();
    const data = back.data;
    if (data.type !== 'question') throw new Error('not a question');
    expect(data.content).toBe('which one?');
    expect(data.options).toEqual([
      { type: 'note', content: 'option a' },
      { type: 'note', content: 'option b' },
      { type: 'note', content: 'option c' },
    ]);
    expect(data.expiresAt).toBe('2026-12-25T12:00:00.000Z');
    expect(data.multiple).toBe(true);
    expect(data.votersVisible).toBe(false);
  });

  it('clears the stash on the reverse switch, so a later note -> poll starts fresh', () => {
    const back = toQuestion(toNote(typedQuestion()));
    // a plain note -> poll still builds the default blank poll
    const fresh = toQuestion({
      ...back,
      type: 'note',
      data: { type: 'note', content: 'q' },
    });
    const data = fresh.data;
    if (data.type !== 'question') throw new Error('not a question');
    expect(data.options).toEqual([
      { type: 'note', content: '' },
      { type: 'note', content: '' },
    ]);
    const days =
      (new Date(data.expiresAt ?? '').getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29);
  });

  it('restores the stash on a second poll -> note -> poll trip', () => {
    const trip = toNote(toQuestion(toNote(typedQuestion())));
    expect(trip.data.type).toBe('note');
    expect(trip.questionDraft?.options).toHaveLength(3);
    expect(trip.questionDraft?.expiresAt).toBe('2026-12-25T12:00:00.000Z');
  });
});
