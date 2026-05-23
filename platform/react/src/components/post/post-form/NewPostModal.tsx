import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type {
  GroupWithMeta,
  MediaAttachmentData,
  PostCreationData,
  PublicProfile,
  VisibilityType,
} from '@openpeeps/common';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { ComposeAttachments } from './ComposeAttachments';
import { ComposePreviewLinks } from './ComposePreviewLinks';
import { MentionTextarea } from './MentionTextarea';
import { PostAudienceSelector } from './PostAudienceSelector';
import { audienceSummary } from './audienceChoices';
import { Avatar } from '../../profile';

export interface NewPostModalProps {
  visibility?: VisibilityType;
  group?: GroupWithMeta;
  onClose: () => void;
}

type ComposerType = 'note' | 'question';

export function NewPostModal({
  visibility: initialVisibility,
  group,
  onClose,
}: NewPostModalProps) {
  const t = useT();
  const serverInfo = useServerInfo();
  const defaultVisibility = useDefaultVisibility();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audienceOpen, setAudienceOpen] = useState(false);

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

  const publish = async () => {
    setError(null);
    setSubmitting(true);
    try {
      let payload: PostCreationData;
      if (composerType === 'question') {
        const options = pollOptions
          .map((text) => text.trim())
          .filter(Boolean)
          .map((text) => ({ type: 'note' as const, content: text }));
        if (options.length < 2) {
          setError('Polls need at least two options.');
          setSubmitting(false);
          return;
        }
        payload = {
          ...defaultNewQuestion(serverInfo.publicContent),
          visibility: group ? 'group' : visibility,
          groupId: group?.id ?? groupId,
          audience: visibility === 'direct' ? audience : undefined,
          data: {
            type: 'question',
            content: content.trim(),
            options,
            expiresAt: expiresAt
              ? new Date(expiresAt).toISOString()
              : undefined,
          },
        };
      } else {
        payload = {
          ...defaultNewNote(serverInfo.publicContent),
          visibility: group ? 'group' : visibility,
          groupId: group?.id ?? groupId,
          audience: visibility === 'direct' ? audience : undefined,
          data: {
            type: 'note',
            content: content.trim(),
            attachments: attachments.length ? attachments : undefined,
          },
        };
      }

      if (!content.trim() && composerType === 'note' && attachments.length === 0) {
        setError('Content is required.');
        setSubmitting(false);
        return;
      }

      if (visibility === 'direct' && audience.length === 0) {
        setError('Choose at least one recipient for a direct post.');
        setSubmitting(false);
        return;
      }

      if (visibility === 'group' && !group?.id && !groupId) {
        setError('Choose a group for a group post.');
        setSubmitting(false);
        return;
      }

      await createPost(payload);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
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

          <div className="flex gap-2">
            {(['note', 'question'] as const).map((type) => (
              <Button
                key={type}
                variant={
                  composerType === type
                    ? 'variant-filled-primary'
                    : 'variant-ghost-primary'
                }
                action={() => setComposerType(type)}
              >
                {type === 'note'
                  ? t('posts.types.note', { defaultValue: 'Note' })
                  : t('posts.types.poll', { defaultValue: 'Poll' })}
              </Button>
            ))}
          </div>

          <MentionTextarea
            rows={5}
            value={content}
            onChange={setContent}
            placeholder={
              composerType === 'question'
                ? t('posts.form.poll.question', { defaultValue: 'Poll question…' })
                : t('posts.form.note.placeholder', {
                    defaultValue: 'What is on your mind?',
                  })
            }
          />

          <ComposePreviewLinks content={content} />

          {composerType === 'note' ? (
            <ComposeAttachments
              attachments={attachments}
              onChange={setAttachments}
            />
          ) : null}

          {composerType === 'question' ? (
            <div className="space-y-2">
              {pollOptions.map((opt, index) => (
                <Input
                  key={index}
                  value={opt}
                  placeholder={`Option ${index + 1}`}
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

          {error ? <p className="text-error text-sm">{error}</p> : null}

          <DialogFooter>
            <Button variant="variant-ghost-primary" action={onClose}>
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              variant="variant-filled-primary"
              action={publish}
              disabled={submitting}
            >
              {submitting
                ? t('common.posting', { defaultValue: 'Posting…' })
                : t('posts.form.publish', { defaultValue: 'Publish' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
