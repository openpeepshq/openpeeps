import { useEffect, useMemo, useState } from 'react';
import { Image, Paperclip } from 'lucide-react';
import type { PostCreationData, PublicPost } from '@openpeeps/common/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ModalFooter,
} from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { useToast } from '../../layout/ToastProvider';
import { useCurrentProfile } from '../../layout/IdentityContext';
import {
  defaultNewNote,
  defaultNewQuestion,
  resetReplyData,
  useReplyStore,
} from '../../../stores/newPosts';
import { useServerInfo } from '../../server-data';
import { ThreadPost } from '../feed/threaded/ThreadPost';
import { Avatar } from '../../profile';
import { OpenpeepsMarkdownInput } from './OpenpeepsMarkdownInput';
import { ComposePreviewLinks } from './ComposePreviewLinks';
import { useComposeAttachments } from './ComposeAttachments';
import { PostTypeSwitcher } from './PostTypeSwitcher';
import { PollComposerFields } from './PollComposerFields';

export interface ReplyModalProps {
  post: PublicPost;
  onClose: () => void;
}

type ComposerType = 'note' | 'question';

export function ReplyModal({ post, onClose }: ReplyModalProps) {
  const t = useT();
  const { success, error: toastError } = useToast();
  const serverInfo = useServerInfo();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();
  const replyStore = useReplyStore(post.id);
  const [submitting, setSubmitting] = useState(false);

  const draft = replyStore.get();
  const composerType: ComposerType =
    draft.data.type === 'question' ? 'question' : 'note';

  useEffect(() => {
    replyStore.set((prev) => ({
      ...prev,
      visibility: post.visibility,
      groupId: post.groupId ?? undefined,
      inReplyToId: post.id,
      audience: post.audience,
    }));
  }, [post.audience, post.groupId, post.id, post.visibility, replyStore]);

  const content =
    draft.data.type === 'note' || draft.data.type === 'question'
      ? (draft.data.content ?? '')
      : '';

  const attachments =
    draft.data.type === 'note' ? (draft.data.attachments ?? []) : [];

  const pollOptions =
    draft.data.type === 'question'
      ? draft.data.options.map((o) => o.content)
      : ['', ''];

  const expiresAt =
    draft.data.type === 'question' && draft.data.expiresAt
      ? draft.data.expiresAt.slice(0, 16)
      : '';

  const composeAttachments = useComposeAttachments({
    attachments,
    onChange: (next) => {
      if (draft.data.type !== 'note') return;
      replyStore.set({
        ...draft,
        data: { ...draft.data, attachments: next },
      });
    },
  });

  const setComposerType = (type: ComposerType) => {
    const base =
      type === 'question'
        ? defaultNewQuestion(serverInfo.publicContent)
        : defaultNewNote(serverInfo.publicContent);
    replyStore.set({
      ...draft,
      type,
      data: base.data,
    });
  };

  const setContent = (value: string) => {
    if (draft.data.type !== 'note' && draft.data.type !== 'question') return;
    replyStore.set({
      ...draft,
      data: { ...draft.data, content: value },
    });
  };

  const trimmedContent = content.trim();
  const validPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);

  const canSubmit = useMemo(() => {
    if (submitting || composeAttachments.pending) return false;
    if (composerType === 'question') {
      return trimmedContent.length > 0 && validPollOptions.length >= 2;
    }
    return (
      (trimmedContent.length > 0 && trimmedContent.length <= 500) ||
      attachments.length > 0
    );
  }, [
    submitting,
    composeAttachments.pending,
    composerType,
    trimmedContent,
    validPollOptions.length,
    attachments.length,
  ]);

  const publish = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      let payload: PostCreationData = { ...draft };
      if (composerType === 'question' && payload.data.type === 'question') {
        payload = {
          ...payload,
          type: 'question',
          data: {
            ...payload.data,
            type: 'question',
            content: trimmedContent,
            options: validPollOptions.map((text) => ({
              type: 'note' as const,
              content: text,
            })),
            expiresAt: expiresAt
              ? new Date(expiresAt).toISOString()
              : payload.data.expiresAt,
          },
        };
      } else if (composerType === 'note' && payload.data.type === 'note') {
        payload = {
          ...payload,
          type: 'note',
          data: {
            type: 'note',
            content: trimmedContent,
            attachments: attachments.length ? attachments : undefined,
          },
        };
      }
      await createPost(payload);
      resetReplyData(post.id);
      success(
        t('posts.replyModal.successToast', {
          defaultValue: 'Reply posted',
        }),
      );
      onClose();
    } catch {
      toastError(
        t('posts.replyModal.errorToast', {
          defaultValue: 'Failed to post reply',
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-0 overflow-hidden p-0">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-4 pt-6">
            <DialogHeader>
              <DialogTitle>
                {t('posts.replyModal.title', { defaultValue: 'Reply' })}
              </DialogTitle>
            </DialogHeader>
            <ThreadPost post={post} noActions noMenu />
            <div className="m-4 flex gap-2">
              {me ? <Avatar profile={me} size={3} /> : null}
              <div className="w-full space-y-2">
                <OpenpeepsMarkdownInput
                  rows={4}
                  value={content}
                  onChange={setContent}
                  placeholder={
                    composerType === 'question'
                      ? t('posts.form.poll.question', {
                          defaultValue: 'Poll question…',
                        })
                      : t('posts.replyPlaceholder', {
                          defaultValue: 'Write a reply…',
                        })
                  }
                />
                <ComposePreviewLinks content={content} />
                {composerType === 'note' ? composeAttachments.previews : null}
                {composerType === 'question' ? (
                  <PollComposerFields
                    options={pollOptions}
                    onOptionsChange={(options) => {
                      if (draft.data.type !== 'question') return;
                      replyStore.set({
                        ...draft,
                        data: {
                          ...draft.data,
                          options: options.map((text) => ({
                            type: 'note' as const,
                            content: text,
                          })),
                        },
                      });
                    }}
                    expiresAt={expiresAt}
                    onExpiresAtChange={(value) => {
                      if (draft.data.type !== 'question') return;
                      replyStore.set({
                        ...draft,
                        data: {
                          ...draft.data,
                          expiresAt: value
                            ? new Date(value).toISOString()
                            : undefined,
                        },
                      });
                    }}
                    multiple={
                      draft.data.type === 'question'
                        ? draft.data.multiple
                        : false
                    }
                    onMultipleChange={(value) => {
                      if (draft.data.type !== 'question') return;
                      replyStore.set({
                        ...draft,
                        data: { ...draft.data, multiple: value },
                      });
                    }}
                    votersVisible={
                      draft.data.type === 'question'
                        ? draft.data.votersVisible
                        : false
                    }
                    onVotersVisibleChange={(value) => {
                      if (draft.data.type !== 'question') return;
                      replyStore.set({
                        ...draft,
                        data: { ...draft.data, votersVisible: value },
                      });
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
          <ModalFooter className="border-t">
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {composerType === 'note' ? (
                  <>
                    <Button
                      compact
                      variant="variant-ghost-primary"
                      title={t('posts.form.addImage', {
                        defaultValue: 'Add image',
                      })}
                      action={composeAttachments.openImagePicker}
                    >
                      <Image className="size-5" />
                    </Button>
                    <Button
                      compact
                      variant="variant-ghost-primary"
                      title={t('posts.form.addAttachment', {
                        defaultValue: 'Add attachment',
                      })}
                      action={composeAttachments.openDocumentPicker}
                    >
                      <Paperclip className="size-5" />
                    </Button>
                  </>
                ) : null}
                <PostTypeSwitcher
                  type={composerType}
                  onSelect={setComposerType}
                  onClose={onClose}
                  showEventType={false}
                  showArticleType={false}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="variant-ghost-primary" action={onClose}>
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </Button>
                <Button
                  variant="variant-filled-primary"
                  action={publish}
                  disabled={!canSubmit}
                >
                  {submitting
                    ? t('common.posting', { defaultValue: 'Posting…' })
                    : t('posts.reply', { defaultValue: 'Reply' })}
                </Button>
              </div>
            </div>
          </ModalFooter>
        </DialogContent>
      </Dialog>
      {composeAttachments.inputs}
    </>
  );
}
