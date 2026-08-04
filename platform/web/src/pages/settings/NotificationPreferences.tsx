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
  type PushSubscriptionError,
} from '@openpeeps/react';
import { useCurrentProfile, useServerInfo } from '@openpeeps/react/components';
import { Button, Toast } from '@openpeeps/react-ui';

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
  const [actionError, setActionError] = useState<string | null>(null);

  if (!vapidKey) {
    return (
      <p className="text-muted-foreground text-sm">
        {t('settings.notifications.serverPushDisabled', {
          defaultValue: 'Push notifications are not configured on this server.',
        })}
      </p>
    );
  }

  const errorMessage = (code: PushSubscriptionError) => {
    switch (code) {
      case 'unsupported':
        return t('settings.notifications.pushUnsupported', {
          defaultValue: 'Push notifications are not supported in this browser.',
        });
      case 'no-service-worker':
        return t('settings.notifications.pushServiceWorkerRequired', {
          defaultValue:
            'Push notifications require the app service worker. They are unavailable in this environment.',
        });
      case 'permission-denied':
        return t('settings.notifications.pushPermissionDenied', {
          defaultValue:
            'Notification permission was denied. Enable it in your browser settings and try again.',
        });
      default:
        return t('settings.notifications.pushSubscribeFailed', {
          defaultValue:
            'Could not enable push notifications. Please try again.',
        });
    }
  };

  const handleToggle = async (enabled: boolean) => {
    setActionError(null);
    if (!enabled) {
      await push.unsubscribe();
      return;
    }
    const error = await push.subscribe();
    if (error) setActionError(errorMessage(error));
  };

  const sendTest = async () => {
    const subscription = await getPushSubscription();
    const auth = subscription?.toJSON().keys?.auth;
    if (auth) {
      await testPush({ subscriptionKey: auth });
    }
  };

  const unavailable =
    !push.isSupported || (!push.isLoading && !push.hasServiceWorker);
  const unavailableMessage = unavailable
    ? errorMessage(push.isSupported ? 'no-service-worker' : 'unsupported')
    : null;

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
            disabled={push.isLoading || unavailable}
            onChange={(e) => void handleToggle(e.target.checked)}
          />
          <div className="bg-surface-300 peer-checked:bg-primary h-5 w-9 rounded-full"></div>
          <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></div>
        </label>
      </div>
      {unavailableMessage ? (
        <p className="text-muted-foreground mt-2 text-sm">
          {unavailableMessage}
        </p>
      ) : null}
      {actionError && !unavailableMessage ? (
        <p className="text-error mt-2 text-sm">{actionError}</p>
      ) : null}
      {push.isSubscribed ? (
        <div className="pt-3">
          <Button variant="default" action={sendTest}>
            {t('settings.notifications.testPush', {
              defaultValue: 'Send test push',
            })}
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
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
      // Push device registration is best-effort — preference saves must not
      // fail when the browser already has a push subscription for another key.
      let pushWarning: string | undefined;
      if (wantsPush && vapidKey) {
        try {
          await subscribePushNotifications({
            client,
            applicationServerKey: vapidKey,
          });
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

  return (
    <section className="mr-4 mt-5 p-4">
      <h2 className="mb-2 text-lg font-medium">
        {t('settings.notifications.pushSettings', {
          defaultValue: 'Push settings',
        })}
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
        <Toast variant={status.type} onDismiss={() => setStatus(null)}>
          {status.message}
        </Toast>
      ) : null}

      <div className="pt-3">
        <Button
          variant="variant-filled-primary"
          className="w-full"
          action={save}
          disabled={saving}
          data-testid="settings-save-button"
        >
          {saving
            ? t('common.submitting', { defaultValue: 'Submitting…' })
            : t('common.submit', { defaultValue: 'Submit' })}
        </Button>
      </div>
    </section>
  );
}
