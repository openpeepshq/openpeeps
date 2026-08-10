import { useSyncExternalStore } from 'react';
import type { PostCreationData, PostType } from '@openpeepshq/common';
import { persistedStore } from './createStore';
import type { NewPostsState } from './types';

const defaultVisibility = (publicContent: boolean) =>
  publicContent ? ('public' as const) : ('local' as const);

export const defaultNewEvent = (publicContent = false): PostCreationData => ({
  type: 'event',
  visibility: defaultVisibility(publicContent),
  data: {
    type: 'event',
    start: new Date().toISOString(),
    wholeDay: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    jam: {
      type: 'video-call',
      moderators: [],
      videoEnabled: true,
      speakers: [],
      presenters: [],
      audience: [],
      waitingRoom: false,
    },
  },
  mentions: [],
});

export const defaultNewNote = (publicContent = false): PostCreationData => ({
  type: 'note',
  visibility: defaultVisibility(publicContent),
  data: { type: 'note', content: '' },
  mentions: [],
});

export const defaultNewQuestion = (
  publicContent = false,
): PostCreationData => ({
  type: 'question',
  visibility: defaultVisibility(publicContent),
  data: {
    type: 'question',
    content: '',
    options: [
      { type: 'note', content: '' },
      { type: 'note', content: '' },
    ],
  },
  mentions: [],
});

export const defaultNewArticle = (publicContent = false): PostCreationData => ({
  type: 'article',
  visibility: defaultVisibility(publicContent),
  data: { type: 'article', content: '' },
});

export const eventSanitizer = (publicContent = false) => {
  const def = defaultNewEvent(publicContent);
  return (event: PostCreationData): PostCreationData => {
    if (event.type !== 'event' || event.data.type !== 'event') return def;
    return {
      type: 'event',
      visibility: event.visibility,
      data: {
        type: 'event',
        start: event.data.start,
        wholeDay: event.data.wholeDay,
        timeZone: event.data.timeZone,
        jam: event.data.jam,
        url: event.data.url,
        physicalLocation: event.data.physicalLocation,
        image: event.data.image,
        name: event.data.name,
        content: event.data.content,
        end: event.data.end,
        attendeeListPublic: event.data.attendeeListPublic,
        ...(event.data.maxAttendees != null
          ? { maxAttendees: event.data.maxAttendees }
          : {}),
      },
      mentions: event.mentions,
      audience: event.audience,
      groupId: event.groupId,
      inReplyToId: event.inReplyToId,
    };
  };
};

let initialized: NewPostsState | undefined;

const ensureInitialized = (publicContent = false): NewPostsState => {
  if (initialized) return initialized;

  const jam = persistedStore('new-jam-state', defaultNewEvent(publicContent));
  const event = persistedStore(
    'new-event-state',
    defaultNewEvent(publicContent),
  );
  const article = persistedStore(
    'new-article-state',
    defaultNewArticle(publicContent),
  );
  const note = persistedStore('new-note-state', defaultNewNote(publicContent));
  const question = persistedStore(
    'new-question-state',
    defaultNewQuestion(publicContent),
  );

  initialized = {
    get jam() {
      return jam.get();
    },
    set jam(v: PostCreationData) {
      jam.set(v);
    },
    resetNewJamState: () => jam.reset(),
    get event() {
      return event.get();
    },
    set event(v: PostCreationData) {
      event.set(v);
    },
    resetNewEventState: () => event.reset(),
    get article() {
      return article.get();
    },
    set article(v: PostCreationData) {
      article.set(v);
    },
    resetNewArticleState: () => article.reset(),
    get note() {
      return note.get();
    },
    set note(v: PostCreationData) {
      note.set(v);
    },
    resetNewNoteState: () => note.reset(),
    get question() {
      return question.get();
    },
    set question(v: PostCreationData) {
      question.set(v);
    },
    resetNewQuestionState: () => question.reset(),
  };

  // wire subscribe so React `useNewPostStores` can re-render on writes
  internalStores = { jam, event, article, note, question };
  return initialized;
};

let internalStores:
  | {
      jam: ReturnType<typeof persistedStore<PostCreationData>>;
      event: ReturnType<typeof persistedStore<PostCreationData>>;
      article: ReturnType<typeof persistedStore<PostCreationData>>;
      note: ReturnType<typeof persistedStore<PostCreationData>>;
      question: ReturnType<typeof persistedStore<PostCreationData>>;
    }
  | undefined;

export const initializeNewPostStores = (publicContent = false) => {
  ensureInitialized(publicContent);
};

export const getNewPostStores = (): NewPostsState => ensureInitialized();

export const useNewPostStores = (): NewPostsState => {
  ensureInitialized();
  // Subscribe to all five sub-stores so any write triggers a re-render.
  useSyncExternalStore(
    (l) => {
      const subs = [
        internalStores!.jam.subscribe(l),
        internalStores!.event.subscribe(l),
        internalStores!.article.subscribe(l),
        internalStores!.note.subscribe(l),
        internalStores!.question.subscribe(l),
      ];
      return () => subs.forEach((u) => u());
    },
    () => null,
    () => null,
  );
  return initialized!;
};

const defaultReplyData = (inReplyToId: string): PostCreationData => ({
  type: 'note',
  visibility: 'public',
  data: { type: 'note', content: '' },
  inReplyToId,
  mentions: [],
});

const replyStores = new Map<
  string,
  ReturnType<typeof persistedStore<PostCreationData>>
>();

/** Persisted draft store for a reply to a specific post. */
export const getReplyStore = (inReplyToId: string) => {
  const existing = replyStores.get(inReplyToId);
  if (existing) return existing;
  const store = persistedStore(
    `reply-data-${inReplyToId}`,
    defaultReplyData(inReplyToId),
  );
  replyStores.set(inReplyToId, store);
  return store;
};

export const resetReplyData = (inReplyToId: string) => {
  getReplyStore(inReplyToId).reset();
};

export const useReplyStore = (inReplyToId: string) => {
  const store = getReplyStore(inReplyToId);
  useSyncExternalStore(store.subscribe, store.get, store.get);
  return store;
};

export const resetStore = (type: PostType) => {
  const stores = getNewPostStores();
  switch (type) {
    case 'event':
    case 'note':
      stores.resetNewEventState();
      return;
    case 'question':
      stores.resetNewQuestionState();
      return;
    case 'article':
      stores.resetNewArticleState();
      return;
    default:
      return;
  }
};
