import { useEffect, useState } from 'react';
import {
  deepSet,
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
  const [settings, setSettings] = useState<ProfileSettings>(
    () =>
      ({
        id: me?.id ?? '',
        notifications: {},
      }) as unknown as ProfileSettings,
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (settingsQuery.data) setSettings(settingsQuery.data);
  }, [settingsQuery.data]);

  const setTypeSettings = (type: string, next: ProfileNotificationSettings) => {
    setSettings((current) => {
      const copy = { ...current };
      deepSet(copy, `notifications.${type}`, next);
      return copy;
    });
  };

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
  };
};
