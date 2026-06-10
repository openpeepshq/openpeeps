import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Image, Megaphone, Paperclip } from 'lucide-react';
import type {
  GroupWithMeta,
  MediaAttachmentData,
  PostCreationData,
  PublicProfile,
  VisibilityType,
} from '@openpeeps/common';
import { checkRoleCapabilities } from '@openpeeps/common';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ModalFooter,
  Button,
  Label,
  Input,
} from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { useServerInfo } from '../../server-data';
import { useDefaultVisibility } from '../visibility';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { defaultNewNote, defaultNewQuestion } from '../../../stores/newPosts';
import { useComposeAttachments } from './ComposeAttachments';
import { ComposePreviewLinks } from './ComposePreviewLinks';
import { MentionTextarea } from './MentionTextarea';
import { PostAudienceSelector } from './PostAudienceSelector';
import { PostTypeSwitcher } from './PostTypeSwitcher';
import { audienceSummary } from './audienceChoices';
import { Avatar } from '../../profile';

export interface NewPostToast {
  type: 'success' | 'error';
  message: string;
}

export interface NewPostModalProps {
  visibility?: VisibilityType;
  group?: GroupWithMeta;
  onClose: () => void;
  onToast: (toast: NewPostToast) => void;
}

type ComposerType = 'note' | 'question';

export function NewPostModal({
  visibility: initialVisibility,
  group,
  onClose,
  onToast,
}: NewPostModalProps) {
  const t = useT();
  const serverInfo = useServerInfo();
  const defaultVisibility = useDefaultVisibility();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();
  const announcePost = openpeepsApi.admin.announcePostAction();
  const joinGroup = openpeepsApi.joinGroupAction();

  const [composerType, setComposerType] = useState<ComposerType>('note');
  const [visibility, setVisibility] = useState<VisibilityType>(
    group ? 'group' : (initialVisibility ?? defaultVisibility),
  );
  const [groupId, setGroupId] = useState<string | undefined>(group?.id);
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<MediaAttachmentData[]>([]);
  const [audience, setAudience] = useState<PublicProfile[]>([]);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [expiresAt, setExpiresAt] = useState('');
  const [notify, setNotify] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [audienceOpen, setAudienceOpen] = useState(false);

  const composeAttachments = useComposeAttachments({
    attachments,
    onChange: setAttachments,
  });

  const canNotify = useMemo(
    () =>
      checkRoleCapabilities(me?.roles ?? [], ['allpeep-core-admin-notify'])
        .success,
    [me?.roles],
  );

  const selectedGroupName = useMemo(() => {
    if (!groupId) return undefined;
    if (group?.id === groupId) {
      return group.displayName ?? group.handle;
    }
    return me?.memberships?.find((m) => m.group.id === groupId)?.group
      .displayName;
  }, [group, groupId, me?.memberships]);

  useEffect(() => {
    if (!serverInfo.publicContent && visibility === 'public') {
      setVisibility('local');
    }
  }, [serverInfo.publicContent, visibility]);

  const trimmedContent = content.trim();
  const validPollOptions = pollOptions.map((o) => o.trim()).filter(Boolean);

  // Mirrors the Svelte `isPostFormSubmittable`: block while uploading, and
  // require enough content for the active composer type.
  const canSubmit = useMemo(() => {
    if (submitting || composeAttachments.pending) return false;
    if (visibility === 'direct' && audience.length === 0) return false;
    if (visibility === 'group' && !group?.id && !groupId) return false;
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
    visibility,
    audience.length,
    group?.id,
    groupId,
    composerType,
    trimmedContent,
    validPollOptions.length,
    attachments.length,
  ]);

  const publish = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const targetGroupId = group?.id ?? groupId;
      let payload: PostCreationData;
      if (composerType === 'question') {
        payload = {
          ...defaultNewQuestion(serverInfo.publicContent),
          visibility: group ? 'group' : visibility,
          groupId: targetGroupId,
          audience: visibility === 'direct' ? audience : undefined,
          data: {
            type: 'question',
            content: trimmedContent,
            options: validPollOptions.map((text) => ({
              type: 'note' as const,
              content: text,
            })),
            expiresAt: expiresAt
              ? new Date(expiresAt).toISOString()
              : undefined,
          },
        };
      } else {
        payload = {
          ...defaultNewNote(serverInfo.publicContent),
          visibility: group ? 'group' : visibility,
          groupId: targetGroupId,
          audience: visibility === 'direct' ? audience : undefined,
          data: {
            type: 'note',
            content: trimmedContent,
            attachments: attachments.length ? attachments : undefined,
          },
        };
      }

      // Posting into a group you haven't joined yet auto-joins you first, so
      // the post lands as a member (mirrors the Svelte modal).
      if (
        targetGroupId &&
        !me?.memberships?.some((m) => m.group.id === targetGroupId)
      ) {
        await joinGroup({ id: targetGroupId });
      }

      const response = await createPost(payload);
      if (notify && canNotify && response?.id) {
        await announcePost({ id: response.id });
      }
      onToast({
        type: 'success',
        message: t('posts.create.successToast', {
          defaultValue: 'Post created successfully',
        }),
      });
    } catch {
      onToast({
        type: 'error',
        message: t('posts.create.errorGeneric', {
          defaultValue: 'An error occurred while creating the post',
        }),
      });
    } finally {
      setSubmitting(false);
      onClose();
    }
  };

  const showNotify =
    canNotify && (visibility === 'public' || visibility === 'local');

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="flex max-h-[90vh] max-w-xl flex-col gap-0 overflow-hidden p-0">
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 pb-4 pt-6">
            <DialogHeader>
              <DialogTitle>
                {t('posts.newPost.title', { defaultValue: 'New post' })}
              </DialogTitle>
            </DialogHeader>

            {!group && me ? (
            <button
              type="button"
              title={t('posts.form.changeAudience', {
                defaultValue: 'Change audience',
              })}
              className="hover:bg-surface-100 flex w-full items-center gap-3 rounded-md border p-3 text-left"
              onClick={() => setAudienceOpen(true)}
            >
              <Avatar profile={me} size={3} borderless />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1 font-medium capitalize">
                  {me.displayName ?? me.handle}
                  <ChevronDown className="text-muted-foreground size-4" />
                </span>
                <span className="text-muted-foreground truncate text-sm">
                  {audienceSummary(
                    visibility,
                    t,
                    selectedGroupName,
                    audience.length,
                  )}
                </span>
              </span>
            </button>
          ) : null}

          <MentionTextarea
            rows={5}
            value={content}
            onChange={setContent}
            testId="posts-composer-content"
            placeholder={
              composerType === 'question'
                ? t('posts.form.poll.question', { defaultValue: 'Poll question…' })
                : t('posts.form.note.placeholder', {
                    defaultValue: 'What is on your mind?',
                  })
            }
          />

          <ComposePreviewLinks content={content} />

          {composerType === 'note' ? composeAttachments.previews : null}

          {composerType === 'question' ? (
            <div className="space-y-2">
              {pollOptions.map((opt, index) => (
                <Input
                  key={index}
                  value={opt}
                  placeholder={`Option ${index + 1}`}
                  data-testid={`posts-poll-option-${index + 1}`}
                  onChange={(e) =>
                    setPollOptions((prev) => {
                      const next = [...prev];
                      next[index] = e.target.value;
                      return next;
                    })
                  }
                />
              ))}
              {pollOptions.length < 6 ? (
                <Button
                  variant="variant-ghost-primary"
                  action={() => setPollOptions((prev) => [...prev, ''])}
                >
                  {t('posts.form.poll.addOption', { defaultValue: 'Add option' })}
                </Button>
              ) : null}
              <div className="space-y-1">
                <Label htmlFor="poll-expires">
                  {t('posts.form.poll.expiresAt', { defaultValue: 'Expires at' })}
                </Label>
                <Input
                  id="poll-expires"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
          ) : null}

          {showNotify ? (
            <div className="flex w-full items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Megaphone className="size-5" />
                <p className="text-base">
                  {t('posts.form.notifyEveryone', {
                    defaultValue: 'Notify everyone',
                  })}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notify}
                onClick={() => setNotify((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition ${
                  notify ? 'bg-primary' : 'bg-surface-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-white transition ${
                    notify ? 'left-4' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          ) : null}
          </div>

          <ModalFooter className="z-30 flex-col items-stretch border-t-0 px-6 py-4">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-x-2">
                <button
                  type="button"
                  title={t('posts.form.addImage', { defaultValue: 'Add Media' })}
                  onClick={composeAttachments.openImagePicker}
                  className="hover:bg-surface-200 rounded-md p-2"
                >
                  <Image className="size-5" />
                </button>
                <button
                  type="button"
                  title={t('posts.form.addDocument', {
                    defaultValue: 'Add Document',
                  })}
                  onClick={composeAttachments.openDocumentPicker}
                  className="hover:bg-surface-200 rounded-md p-2"
                >
                  <Paperclip className="size-5" />
                </button>
              </div>

              <PostTypeSwitcher
                type={composerType}
                onSelect={setComposerType}
                onClose={onClose}
              />
            </div>

            <div className="border-surface-400 my-2 w-full border-t" />

            <div className="flex items-center justify-end gap-x-2">
              <Button
                variant="variant-filled-primary"
                action={publish}
                disabled={!canSubmit}
                data-testid="posts-composer-publish"
              >
                {submitting
                  ? t('common.posting', { defaultValue: 'Posting…' })
                  : t('posts.create.submit', { defaultValue: 'Post' })}
              </Button>
            </div>
          </ModalFooter>
        </DialogContent>
      </Dialog>

      {composeAttachments.inputs}

      {!group ? (
        <PostAudienceSelector
          open={audienceOpen}
          onClose={() => setAudienceOpen(false)}
          type={composerType}
          visibility={visibility}
          groupId={groupId}
          audience={audience}
          onConfirm={(settings) => {
            setVisibility(settings.visibility);
            setGroupId(settings.groupId ?? undefined);
            setAudience(settings.audience ?? []);
          }}
        />
      ) : null}
    </>
  );
}
