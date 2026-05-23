import { useEffect, useState } from 'react';
import type {
  GroupWithMeta,
  PostCreationData,
  VisibilityType,
} from '@openpeeps/common';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Textarea,
  Label,
  Input,
} from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { useServerInfo } from '../../server-data';
import { useDefaultVisibility } from '../visibility';
import { defaultNewNote, defaultNewQuestion } from '../../../stores/newPosts';

export interface NewPostModalProps {
  visibility?: VisibilityType;
  group?: GroupWithMeta;
  onClose: () => void;
}

type ComposerType = 'note' | 'question';

const VISIBILITY_OPTIONS: VisibilityType[] = [
  'public',
  'local',
  'direct',
  'group',
];

export function NewPostModal({
  visibility: initialVisibility,
  group,
  onClose,
}: NewPostModalProps) {
  const t = useT();
  const serverInfo = useServerInfo();
  const defaultVisibility = useDefaultVisibility();
  const { openpeepsApi } = useOpenpeeps();
  const createPost = openpeepsApi.createPostAction();

  const [composerType, setComposerType] = useState<ComposerType>('note');
  const [visibility, setVisibility] = useState<VisibilityType>(
    initialVisibility ?? defaultVisibility,
  );
  const [content, setContent] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          groupId: group?.id,
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
          groupId: group?.id,
          data: { type: 'note', content: content.trim() },
        };
      }

      if (!content.trim() && composerType === 'note') {
        setError('Content is required.');
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('posts.newPost.title', { defaultValue: 'New post' })}
          </DialogTitle>
        </DialogHeader>

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

        {!group ? (
          <div className="space-y-1">
            <Label htmlFor="post-visibility">
              {t('posts.form.visibility', { defaultValue: 'Audience' })}
            </Label>
            <select
              id="post-visibility"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as VisibilityType)
              }
            >
              {VISIBILITY_OPTIONS.filter(
                (v) => v !== 'group' && (v !== 'public' || serverInfo.publicContent),
              ).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <Textarea
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            composerType === 'question'
              ? t('posts.form.poll.question', { defaultValue: 'Poll question…' })
              : t('posts.form.note.placeholder', {
                  defaultValue: 'What is on your mind?',
                })
          }
        />

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
  );
}
