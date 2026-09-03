import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProfileWithMeta } from '@openpeepshq/common/types';
import {
  accountNameSchema,
  profileDataSchema,
} from '@openpeepshq/common/types';
import { useT, useOpenpeeps, useSetPageHeader } from '../../index';
import {
  HeaderAvatarInput,
  LocationInput,
  useCurrentProfile,
  useServerInfo,
  useToast,
} from '../../components';
import { Button, Input, Label, Textarea } from '@openpeepshq/react-ui';
import { ZodError } from 'zod';
import { isDuplicateHandleError } from '../../lib/groupFormErrors';

const firstZodMessage = (err: ZodError): string | undefined =>
  err.issues[0]?.message;

export function PublicProfileSettings() {
  const t = useT();
  const { success, error: toastError } = useToast();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const me = useCurrentProfile();
  const updateProfile = openpeepsApi.updateCurrentProfileAction();
  const submittingRef = useRef(false);

  useSetPageHeader(
    t('settings.publicProfile.title', { defaultValue: 'Public profile' }),
  );

  const additionalFieldDefs = useMemo(
    () => serverInfo.communityConfig?.profiles?.additionalFields ?? [],
    [serverInfo.communityConfig?.profiles?.additionalFields],
  );

  const [draft, setDraft] = useState<Partial<ProfileWithMeta>>({});
  const [submitting, setSubmitting] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);

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
    setHandleError(null);
  }, [me?.id, additionalFieldDefs]);

  if (!me) return null;

  const validateHandle = (value: string): string | null => {
    const result = accountNameSchema.safeParse(value);
    if (result.success) return null;
    const message = firstZodMessage(result.error);
    if (message === 'Handle is reserved') {
      return t('profile.form.handleReserved', {
        defaultValue: 'That handle is reserved. Please choose another.',
      });
    }
    return t('profile.form.handleInvalid', {
      defaultValue:
        'Handle must be 1–16 characters: letters, numbers, underscores, or hyphens (no spaces or punctuation)',
    });
  };

  const submit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const nextHandle = (draft.handle ?? me.handle ?? '').replace(/^@/, '');
    const localHandleError = validateHandle(nextHandle);
    if (localHandleError) {
      setHandleError(localHandleError);
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }
    setHandleError(null);

    try {
      await updateProfile(
        profileDataSchema.parse({
          handle: nextHandle,
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
      if (err instanceof ZodError) {
        const message = firstZodMessage(err);
        if (message?.toLowerCase().includes('handle')) {
          setHandleError(
            message === 'Handle is reserved'
              ? t('profile.form.handleReserved', {
                  defaultValue:
                    'That handle is reserved. Please choose another.',
                })
              : t('profile.form.handleInvalid', {
                  defaultValue:
                    'Handle must be 1–16 characters: letters, numbers, underscores, or hyphens (no spaces or punctuation)',
                }),
          );
          return;
        }
      }
      if (isDuplicateHandleError(err)) {
        const msg = t('profiles.handleExists', {
          defaultValue: 'This handle is already in use by someone else.',
        });
        setHandleError(msg);
        toastError(msg);
        return;
      }
      toastError(
        t('settings.profile.updateError', {
          defaultValue: `There was an error updating your profile: ${(err as Error).message}`,
          error: (err as Error).message,
        }),
      );
    } finally {
      submittingRef.current = false;
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
          maxLength={16}
          aria-invalid={Boolean(handleError)}
          aria-describedby="handle-hint"
          onChange={(e) => {
            const handle = e.target.value.replace(/^@/, '');
            setDraft((d) => ({ ...d, handle }));
            if (handleError) setHandleError(validateHandle(handle));
          }}
          placeholder={t('profile.form.handlePlaceholder', {
            defaultValue: 'your-handle',
          })}
          data-testid="settings-handle-input"
        />
        <p
          id="handle-hint"
          className={
            handleError
              ? 'text-destructive text-sm'
              : 'text-muted-foreground text-sm'
          }
          data-testid="settings-handle-hint"
        >
          {handleError ??
            t('profile.form.handleHint', {
              defaultValue:
                '1–16 characters. Letters, numbers, underscores, and hyphens only — no spaces or punctuation.',
            })}
        </p>
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
        variant="default"
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
