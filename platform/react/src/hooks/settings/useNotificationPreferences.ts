import { useState, useCallback, useMemo } from 'react';
import {
  deepEqual,
  type ProfileNotificationSettings,
  type ProfileSettings,
} from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n/context';
import { useCurrentProfile } from '../../components/layout/IdentityContext';

export type UseNotificationPreferencesArgs = {
  /** Host registers this device for push when any type wants it. */
  ensurePush?: () => Promise<void>;
};

/**
 * Immutable helper that replaces only the targeted notification type,
 * returning a **new** ProfileSettings object (does not mutate the input).
 */
export function setNotificationSetting(
  current: ProfileSettings,
  type: string,
  next: ProfileNotificationSettings,
): ProfileSettings {
  const notifications = { ...(current.notifications ?? {}) };
  notifications[type] = next;
  return { ...current, notifications };
}

/**
 * Derive notifications-only dirty flag.
 * Compares `local` edits vs `saved` baseline, key-order-insensitive.
 * Normalizes entries with `?? {}` so `undefined` vs `{}` is treated as equal.
 */
export function isNotificationsDirty(
  local: ProfileSettings | null,
  saved: ProfileSettings | null,
): boolean {
  if (!local || !saved) return false;
  const localN = local.notifications ?? {};
  const savedN = saved.notifications ?? {};
  const allTypes = new Set([...Object.keys(localN), ...Object.keys(savedN)]);
  for (const type of allTypes) {
    const a = localN[type] ?? {};
    const b = savedN[type] ?? {};
    if (!deepEqual(a, b)) return true;
  }
  return false;
}

export const useNotificationPreferences = ({
  ensurePush,
}: UseNotificationPreferencesArgs = {}) => {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const me = useCurrentProfile();
  const notificationTypesQuery =
    openpeepsApi.useCurrentProfileNotificationTypes();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const updateSettings = openpeepsApi.updateCurrentProfileSettingsAction();
  // Edits-only local state — the baseline is always the query cache.
  const [edits, setEdits] = useState<ProfileSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const settingsReady = !!settingsQuery.data;

  // Derive full settings: edits ?? query data ?? stub
  const settings = edits ?? (settingsQuery.data as ProfileSettings | undefined) ??
    ({ id: me?.id ?? '', notifications: {} }) as unknown as ProfileSettings;

  const dirty = useMemo(() => {
    if (!edits || !settingsQuery.data) return false;
    return isNotificationsDirty(edits, settingsQuery.data);
  }, [edits, settingsQuery.data]);

  const setTypeSettings = useCallback(
    (type: string, next: ProfileNotificationSettings) => {
      setEdits((prev) =>
        setNotificationSetting(
          prev ??
            (settingsQuery.data as ProfileSettings | undefined) ??
            ({ id: me?.id ?? '', notifications: {} }) as unknown as ProfileSettings,
          type,
          next,
        ),
      );
    },
    [settingsQuery.data, me?.id],
  );

  const save = async () => {
    setStatus(null);
    setSaving(true);
    try {
      const wantsPush = Object.values(settings.notifications ?? {}).some(
        (entry) => entry?.push,
      );
      let pushWarning: string | undefined;
      if (wantsPush && ensurePush) {
        try {
          await ensurePush();
        } catch (err) {
          pushWarning =
            err instanceof Error
              ? err.message
              : t('settings.notifications.pushSubscribeFailed', {
                  defaultValue:
                    'Could not enable push notifications on this device.',
                });
        }
      }
      await updateSettings(settings);
      setEdits(null);
      setStatus({
        type: 'success',
        message: pushWarning
          ? t('settings.notifications.updateSuccessPushFailed', {
              defaultValue:
                'Notification settings updated, but push on this device failed: {{detail}}',
              detail: pushWarning,
            })
          : t('settings.notifications.updateSuccess', {
              defaultValue: 'Notification settings updated.',
            }),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return {
    me,
    types: notificationTypesQuery.data ?? [],
    settings,
    setTypeSettings,
    save,
    saving,
    status,
    clearStatus: () => setStatus(null),
    dirty,
    settingsReady,
  };
};
