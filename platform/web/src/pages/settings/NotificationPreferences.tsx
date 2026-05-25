import { useEffect, useState } from 'react';
import {
  deepSet,
  type NotificationType,
  notificationDefaults,
  type ProfileNotificationSettings,
  type ProfileSettings,
} from '@openpeeps/common';
import {
  getPushSubscription,
  subscribePushNotifications,
  usePushSubscription,
  useT,
  useOpenpeeps,
  useSetPageHeader,
} from '@openpeeps/react';
import { useCurrentProfile, useServerInfo } from '@openpeeps/react/components';
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
              <div className="bg-surface-300 peer-checked:bg-primary h-5 w-9 rounded-full"></div>
              <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></div>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

function PushSettingsPanel() {
  const t = useT();
  const { client, openpeepsApi } = useOpenpeeps();
  const serverInfo = useServerInfo();
  const vapidKey = serverInfo.vapid.publicKey;
  const push = usePushSubscription({
    client,
    applicationServerKey: vapidKey,
  });
  const testPush = openpeepsApi.testPushSubscriptionAction();

  if (!vapidKey) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('settings.notifications.serverPushDisabled', {
          defaultValue: 'Push notifications are not configured on this server.',
        })}
      </p>
    );
  }

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await push.subscribe();
    } else {
      await push.unsubscribe();
    }
  };

  const sendTest = async () => {
    const subscription = await getPushSubscription();
    const auth = subscription?.toJSON().keys?.auth;
    if (auth) {
      await testPush({ subscriptionKey: auth });
    }
  };

  return (
    <div className="mb-6 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <p className="text-lg font-medium">
          {t('settings.notifications.pushEnabled', {
            defaultValue: 'Push notifications on this device',
          })}
        </p>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={push.isSubscribed}
            disabled={push.isLoading}
            onChange={(e) => void handleToggle(e.target.checked)}
          />
          <div className="bg-surface-300 peer-checked:bg-primary h-5 w-9 rounded-full"></div>
          <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></div>
        </label>
      </div>
      {push.isSubscribed ? (
        <div className="pt-3">
          <Button variant="default" action={sendTest}>
            {t('settings.notifications.testPush', { defaultValue: 'Send test push' })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function NotificationPreferences() {
  const t = useT();
  const { client, openpeepsApi } = useOpenpeeps();
  const serverInfo = useServerInfo();
  const me = useCurrentProfile();
  const notificationTypesQuery =
    openpeepsApi.useCurrentProfileNotificationTypes();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const updateSettings = openpeepsApi.updateCurrentProfileSettingsAction();
  const vapidKey = serverInfo.vapid.publicKey;

  useSetPageHeader(
    t('settings.notifications.preferences.title', {
      defaultValue: 'Notification preferences',
    }),
  );

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
      const wantsPush = Object.values(settings.notifications ?? {}).some(
        (entry) => entry?.push,
      );
      if (wantsPush && vapidKey) {
        await subscribePushNotifications({ client, applicationServerKey: vapidKey });
      }
      await updateSettings(settings);
      setStatus(
        t('settings.notifications.updateSuccess', {
          defaultValue: 'Notification settings updated.',
        }),
      );
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mr-4 mt-5 p-4">
      <h2 className="mb-2 text-lg font-medium">
        {t('settings.notifications.pushSettings', { defaultValue: 'Push settings' })}
      </h2>
      <PushSettingsPanel />
      <h2 className="mb-2 text-lg font-medium">
        {t('settings.notifications.description', {
          defaultValue: 'Choose how you want to be notified about activity.',
        })}
      </h2>

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

      {status ? (
        <p className="border-success/40 text-success rounded-md border p-2 text-sm">
          {status}
        </p>
      ) : null}

      <div className="pt-3">
        <Button variant="default" action={save} disabled={saving} data-testid="settings-save-button">
          {saving
            ? t('common.submitting', { defaultValue: 'Submitting…' })
            : t('common.submit', { defaultValue: 'Submit' })}
        </Button>
      </div>
    </section>
  );
}
