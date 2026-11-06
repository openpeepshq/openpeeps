import type { PostCreationData } from '@openpeepshq/common';

/**
 * Composer note/poll type switches, shared by the web modals and the native
 * composers. The note body and poll question share one text field, so the
 * typed text (and note attachments) carry over instead of the draft being
 * reset.
 */
export const toQuestion = (postData: PostCreationData): PostCreationData => ({
  ...postData,
  type: 'question',
  data: {
    ...postData.data,
    type: 'question',
    options: [
      {
        type: 'note',
        content: '',
      },
      {
        type: 'note',
        content: '',
      },
    ],
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  },
});

export const toNote = (postData: PostCreationData): PostCreationData => ({
  ...postData,
  type: 'note',
  data: {
    content: postData.data.content,
    type: 'note',
    attachments: postData.data.attachments,
  },
});
