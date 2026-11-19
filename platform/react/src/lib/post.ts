import { POLL_DEFAULT_EXPIRY_MS } from '@openpeepshq/common';
import type { Note, PostCreationData, Question } from '@openpeepshq/common';

/**
 * Structural poll fields stashed on a note draft when switching
 * poll -> note, so `toQuestion` can restore them on the reverse switch.
 * Client-side only: the server strips `questionDraft` before persisting
 * (the `POST /posts` handler parses the stored record with
 * `postDataSchema`, which has no such key).
 */
type SwitchableQuestionDraft = NonNullable<PostCreationData['questionDraft']>;

const pollFieldsOf = (question: Question): SwitchableQuestionDraft => {
  const { options, expiresAt, multiple, votersVisible } = question;
  const draft: SwitchableQuestionDraft = { options };
  if (expiresAt !== undefined) draft.expiresAt = expiresAt;
  if (multiple !== undefined) draft.multiple = multiple;
  if (votersVisible !== undefined) draft.votersVisible = votersVisible;
  return draft;
};

/**
 * Composer note/poll type switches, shared by the web modals and the native
 * composers. The note body and poll question share one text field, so the
 * typed text carries over instead of the draft being reset. Only note and
 * question drafts are accepted, so a future caller can't convert an
 * article/event draft into a malformed poll.
 */
type SwitchablePostData = PostCreationData & {
  data: Note | Question;
};

/**
 * True when the draft can be converted to/from a poll. Used to narrow a
 * `PostCreationData` (whose `data` is the full union) before calling
 * `toNote`/`toQuestion`, so an article/event/resource draft is a compile
 * error at the call site. `data` is required by the type, but the guard is
 * null-safe so a missing payload classifies as non-switchable instead of
 * throwing.
 */
export const isSwitchablePostData = (
  postData: PostCreationData,
): postData is SwitchablePostData =>
  postData.data?.type === 'note' || postData.data?.type === 'question';

export const toQuestion = (postData: SwitchablePostData): PostCreationData => {
  const { questionDraft, ...rest } = postData;
  // A poll can't display media, so note attachments are dropped here (and on
  // a later note -> poll -> note round trip) on purpose. The stash is
  // consumed either way: a usable poll is rebuilt from it, otherwise a
  // fresh blank poll with the default expiry is created.
  const data: Question =
    questionDraft && questionDraft.options && questionDraft.options.length > 0
      ? {
          type: 'question',
          content: postData.data.content,
          options: questionDraft.options,
          expiresAt: questionDraft.expiresAt,
          multiple: questionDraft.multiple,
          votersVisible: questionDraft.votersVisible,
        }
      : {
          type: 'question',
          content: postData.data.content,
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
          expiresAt: new Date(
            Date.now() + POLL_DEFAULT_EXPIRY_MS,
          ).toISOString(),
        };
  return { ...rest, type: 'question', data };
};

export const toNote = (postData: SwitchablePostData): PostCreationData => ({
  ...postData,
  type: 'note',
  // A poll's structural fields (options, expiry, multiple, votersVisible)
  // are stashed on `questionDraft` here so switching back to a poll
  // restores them, instead of `toQuestion` rebuilding a fresh blank poll
  // and losing a half-typed one.
  questionDraft:
    postData.data.type === 'question' ? pollFieldsOf(postData.data) : undefined,
  data: {
    type: 'note',
    content: postData.data.content,
    attachments: postData.data.attachments,
  },
});
