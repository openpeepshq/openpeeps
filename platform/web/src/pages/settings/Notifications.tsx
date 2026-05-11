import { useEffect, useState } from 'react';
import {
  deepSet,
  type NotificationType,
  notificationDefaults,
  type ProfileNotificationSettings,
  type ProfileSettings,
} from '@openpeeps/common';
import { useT, useOpenpeeps } from '@openpeeps/react';
import { useCurrentProfile } from '@openpeeps/react/components';
import { Button } from '@openpeeps/react-ui';

interface NotificationSettingProps {
  notificationType: NotificationType;
  settings?: ProfileNotificationSettings;
  onChange: (settings: ProfileNotificationSettings) => void;
}

function NotificationSettingRow({
  notificationType,
  settings,
  onChange,
}: NotificationSettingProps) {
  const t = useT();
  const effective =
    settings ?? notificationType.defaultSettings ?? notificationDefaults;

  const handleChange = (
    action: 'create' | 'push' | 'email',
    value: boolean,
  ) => {
    const next = { ...effective };
    if (!value && action === 'create') {
      next.create = false;
      next.push = false;
      next.email = false;
    } else {
      next[action] = value;
    }
    onChange(next);
  };

  return (
    <div className="bg-surface-100 mb-3 mt-4 w-full rounded-md p-3">
      <p className="mb-2 font-bold">
        {t(`settings.notifications.types.${notificationType.type}.label`, {
          defaultValue: notificationType.type,
        })}
        :
      </p>
      {(['create', 'push', 'email'] as const).map((action) => (
        <div key={action} className="mb-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {t(`settings.notifications.${action}`, {
                defaultValue: action,
              })}
            </p>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={effective[action] ?? false}
                onChange={(e) => handleChange(action, e.target.checked)}
              />
              <div className="bg-surface-300 h-5 w-9 rounded-full peer-checked:bg-primary"></div>
              <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></div>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationSettings() {
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
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQuery.data) {
      setSettings(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  if (!me) return null;

  const save = async () => {
    setStatus(null);
    setSaving(true);
    try {
      await updateSettings(settings);
      setStatus(
        t('settings.notifications.updateSuccess', {
          defaultValue: 'Notification settings updated.',
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mr-4 mt-5 p-4">
      <h1 className="mb-4 text-2xl font-semibold">
        {t('settings.notifications.title', { defaultValue: 'Notifications' })}
      </h1>
      <p className="text-sm text-muted-foreground">
        {t('settings.notifications.description', {
          defaultValue: 'Choose how you want to be notified about activity.',
        })}
      </p>

      {(notificationTypesQuery.data ?? []).map((nt) => (
        <NotificationSettingRow
          key={nt.type}
          notificationType={nt}
          settings={settings.notifications?.[nt.type]}
          onChange={(s) => {
            const next = { ...settings };
            deepSet(next, `notifications.${nt.type}`, s);
            setSettings(next);
          }}
        />
      ))}

      {status && (
        <p className="border-success/40 text-success rounded-md border p-2 text-sm">
          {status}
        </p>
      )}

      <div className="pt-3">
        <Button
          title="Save"
          variant="variant-filled-primary"
          action={save}
          disabled={saving}
        >
          {saving
            ? t('common.submitting', { defaultValue: 'Submitting…' })
            : t('common.submit', { defaultValue: 'Submit' })}
        </Button>
      </div>
    </section>
  );
}
