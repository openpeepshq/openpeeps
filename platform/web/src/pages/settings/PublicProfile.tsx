import { useState } from 'react';
import type { ProfileWithMeta } from '@openpeeps/common/types';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { HeaderAvatarInput, useCurrentProfile } from '@openpeeps/react/components';
import { Button, Input, Label, Textarea } from '@openpeeps/react-ui';

export function PublicProfileSettings() {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const me = useCurrentProfile();
  const updateProfile = openpeepsApi.updateCurrentProfileAction();

  const [draft, setDraft] = useState<Partial<ProfileWithMeta>>(() => ({
    displayName: me?.displayName ?? '',
    bio: me?.bio ?? '',
    avatar: me?.avatar ?? '',
    header: me?.header ?? '',
    location: me?.location,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<
    | { type: 'success'; message: string }
    | { type: 'error'; message: string }
    | null
  >(null);

  if (!me) return null;

  const submit = async () => {
    setStatus(null);
    setSubmitting(true);
    try {
      await updateProfile({ ...me, ...draft });
      setStatus({
        type: 'success',
        message: t('settings.profile.updateSuccess', {
          defaultValue: 'Profile updated',
        }),
      });
    } catch (err) {
      setStatus({
        type: 'error',
        message: t('settings.profile.updateError', {
          defaultValue: `Failed: ${(err as Error).message}`,
          error: (err as Error).message,
        }),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-semibold">
        {t('settings.publicProfile.title', { defaultValue: 'Public profile' })}
      </h1>

      <HeaderAvatarInput
        header={draft.header ?? undefined}
        avatar={draft.avatar ?? undefined}
        onHeaderChange={(header) => setDraft((d) => ({ ...d, header }))}
        onAvatarChange={(avatar) => setDraft((d) => ({ ...d, avatar }))}
      />

      <div className="space-y-2 pt-4">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={draft.displayName ?? ''}
          onChange={(e) =>
            setDraft((d) => ({ ...d, displayName: e.target.value }))
          }
          data-testid="settings-display-name-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="handle">Handle</Label>
        <Input
          id="handle"
          value={me.handle ?? ''}
          readOnly
          data-testid="settings-handle-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          rows={4}
          value={draft.bio ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
          data-testid="settings-bio-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={draft.location?.text ?? ''}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              location: { ...d.location, text: e.target.value },
            }))
          }
        />
      </div>

      {status && (
        <p
          className={`rounded-md border p-2 text-sm ${status.type === 'error' ? 'border-error/40 text-error' : 'border-success/40 text-success'}`}
        >
          {status.message}
        </p>
      )}

      <Button
        title="Save"
        variant="variant-filled-primary"
        action={submit}
        disabled={submitting}
        data-testid="settings-save-button"
      >
        {submitting
          ? t('common.saving', { defaultValue: 'Saving…' })
          : t('common.save', { defaultValue: 'Save' })}
      </Button>
    </div>
  );
}
