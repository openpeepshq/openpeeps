import {
  PostCreationData,
  PostType,
  PostDataUnion,
} from '@openpeeps/common';
import { create } from 'zustand';

const defaultPostData = (type: PostType): PostDataUnion => {
  switch (type) {
    case 'question':
      return {
        type: 'question',
        content: '',
        options: [],
        expiresAt: new Date(
          Date.now() + 1000 * 60 * 60 * 24 * 30,
        ).toISOString(),
      };
    case 'event':
      return {
        type: 'event',
        content: '',
        start: new Date().toISOString(),
        wholeDay: false,
      };
    case 'note':
    default:
      return { type: 'note', content: '' };

  }
};

export const postDataDefaults = (inReplyToId?: string): PostCreationData => ({
  type: 'note',
  visibility: 'public',
  data: defaultPostData('note'),
  inReplyToId,
});

interface LocalPostStore {
  postData: PostCreationData;
  replyData: Record<string, PostCreationData>;
  setPostData: (postData: PostCreationData) => void;
  resetPostData: () => void;
  setReplyData: (inReplyToId: string, data: PostCreationData) => void;
  resetReplyData: (inReplyToId: string) => void;
}

export const useLocalPostStore = create<LocalPostStore>(set => ({
  postData: postDataDefaults(),
  replyData: {},

  setPostData: postData => set({ postData }),
  resetPostData: () => set({ postData: postDataDefaults() }),

  setReplyData: (inReplyToId, data) =>
    set(state => ({ replyData: { ...state.replyData, [inReplyToId]: data } })),

  resetReplyData: inReplyToId =>
    set(state => {
      const newReplyData = { ...state.replyData };
      newReplyData[inReplyToId] = postDataDefaults(inReplyToId);
      return { replyData: newReplyData };
    }),
}));
