import { useEffect, useMemo, useState } from 'react';
import type { ProfileWithMeta } from '@openpeeps/common/types';
import { profileDataSchema } from '@openpeeps/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '@openpeeps/react';
import {
  HeaderAvatarInput,
  LocationInput,
  useCurrentProfile,
  useServerInfo,
  useToast,
} from '@openpeeps/react/components';
import { Button, Input, Label, Textarea } from '@openpeeps/react-ui';

export function PublicProfileSettings() {
  const t = useT();
  const { success, error: toastError } = useToast();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const me = useCurrentProfile();
  const updateProfile = openpeepsApi.updateCurrentProfileAction();

  useSetPageHeader(
    t('settings.publicProfile.title', { defaultValue: 'Public profile' }),
  );

  const additionalFieldDefs = useMemo(
    () => serverInfo.communityConfig?.profiles?.additionalFields ?? [],
    [serverInfo.communityConfig?.profiles?.additionalFields],
  );

  const [draft, setDraft] = useState<Partial<ProfileWithMeta>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!me) return;
    const existingFields = me.fields ?? [];
    const fields = additionalFieldDefs.map((field) => {
      const match = existingFields.find((f) => f.name === field.label);
      return { name: field.label, value: match?.value ?? '' };
    });
    setDraft({
      displayName: me.displayName ?? '',
      handle: me.handle ?? '',
      bio: me.bio ?? '',
      avatar: me.avatar ?? undefined,
      header: me.header ?? undefined,
      location: me.location,
      fields: fields.length ? fields : undefined,
    });
  }, [me?.id, additionalFieldDefs]);

  if (!me) return null;

  const submit = async () => {
    setSubmitting(true);
    try {
      await updateProfile(
        profileDataSchema.parse({
          handle: draft.handle ?? me.handle,
          type: me.type,
          displayName: draft.displayName,
          bio: draft.bio,
          avatar: draft.avatar || null,
          header: draft.header || null,
          location: draft.location?.text ? draft.location : undefined,
          fields: draft.fields?.filter((f) => f.value.trim()) ?? undefined,
        }),
      );
      success(
        t('settings.profile.updateSuccess', {
          defaultValue: 'Your profile has been updated',
        }),
      );
    } catch (err) {
      toastError(
        t('settings.profile.updateError', {
          defaultValue: `Failed: ${(err as Error).message}`,
          error: (err as Error).message,
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const patchField = (index: number, value: string) => {
    setDraft((d) => {
      const fields = [...(d.fields ?? [])];
      const def = additionalFieldDefs[index];
      if (!def) return d;
      fields[index] = { name: def.label, value };
      return { ...d, fields };
    });
  };

  return (
    <div className="space-y-4 p-4">
      <HeaderAvatarInput
        header={draft.header ?? undefined}
        avatar={draft.avatar ?? undefined}
        onHeaderChange={(header) => setDraft((d) => ({ ...d, header }))}
        onAvatarChange={(avatar) => setDraft((d) => ({ ...d, avatar }))}
      />

      <div className="space-y-2 pt-4">
        <Label htmlFor="displayName">
          {t('profile.form.displayName', { defaultValue: 'Display name' })}
        </Label>
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
        <Label htmlFor="handle">
          {t('profile.form.handle', { defaultValue: 'Handle' })}
        </Label>
        <Input
          id="handle"
          value={draft.handle ?? ''}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              handle: e.target.value.replace(/^@/, ''),
            }))
          }
          placeholder={t('profile.form.handlePlaceholder', {
            defaultValue: 'your-handle',
          })}
          data-testid="settings-handle-input"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">
          {t('profile.form.bio', { defaultValue: 'Bio' })}
        </Label>
        <Textarea
          id="bio"
          rows={4}
          value={draft.bio ?? ''}
          onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
          data-testid="settings-bio-input"
        />
      </div>

      <LocationInput
        title={t('profile.form.location', { defaultValue: 'Location' })}
        value={draft.location}
        onChange={(location) => setDraft((d) => ({ ...d, location }))}
      />

      {additionalFieldDefs.map((field, index) => (
        <div key={field.label} className="space-y-2">
          <Label htmlFor={`field-${index}`}>{field.label}</Label>
          <Input
            id={`field-${index}`}
            value={draft.fields?.[index]?.value ?? ''}
            placeholder={field.label}
            onChange={(e) => patchField(index, e.target.value)}
          />
        </div>
      ))}

      <Button
        title={t('common.save', { defaultValue: 'Save' })}
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
