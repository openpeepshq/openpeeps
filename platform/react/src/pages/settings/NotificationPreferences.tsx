import { useState } from 'react';
import {
  type NotificationType,
  notificationDefaults,
  type ProfileNotificationSettings,
} from '@openpeepshq/common';
import {
  getPushSubscription,
  isBraveBrowser,
  subscribePushNotifications,
  usePushSubscription,
  useT,
  useOpenpeeps,
  useSetPageHeader,
  type PushSubscriptionError,
} from '../../index';
import { useServerInfo } from '../../components';
import { Button, Toast } from '@openpeepshq/react-ui';
import { useNotificationPreferences } from '../../hooks';

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
    <div className="bg-surface mb-3 mt-4 w-full rounded-md p-3">
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
              <div className="bg-input peer-checked:bg-primary h-5 w-9 rounded-full"></div>
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
  const showBraveWarning = isBraveBrowser();

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
          <div className="bg-input peer-checked:bg-primary h-5 w-9 rounded-full"></div>
          <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4"></div>
        </label>
      </div>
      {showBraveWarning ? (
        <div className="border-warning bg-surface-warning mt-3 rounded border p-3 text-sm">
          <p className="font-medium">
            {t('settings.notifications.bravePushWarning.title', {
              defaultValue: 'Brave browser setting required',
            })}
          </p>
          <p className="mt-1">
            {t('settings.notifications.bravePushWarning.body', {
              defaultValue:
                'Brave disables Google push messaging by default. Open {{settingsPath}} and enable "{{settingName}}", then try again.',
              settingsPath: 'brave://settings/privacy',
              settingName: 'Use Google services for push messaging',
            })}
          </p>
          <a
            className="op-anchor mt-2 inline-block"
            href="https://intercom.help/progressier/en/articles/6885624-i-can-t-receive-push-notifications-with-the-brave-browser"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('settings.notifications.bravePushWarning.learnMore', {
              defaultValue: 'Learn more about Brave push notifications',
            })}
          </a>
        </div>
      ) : null}
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
  const { client } = useOpenpeeps();
  const serverInfo = useServerInfo();
  const vapidKey = serverInfo.vapid.publicKey;
  const {
    me,
    types,
    settings,
    setTypeSettings,
    save,
    saving,
    status,
    clearStatus,
  } = useNotificationPreferences({
    ensurePush: vapidKey
      ? async () => {
          await subscribePushNotifications({
            client,
            applicationServerKey: vapidKey,
          });
        }
      : undefined,
  });

  useSetPageHeader(
    t('settings.notifications.preferences.title', {
      defaultValue: 'Notification preferences',
    }),
  );

  if (!me) return null;

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

      {types.map((nt) => (
        <NotificationSettingRow
          key={nt.type}
          notificationType={nt}
          settings={settings.notifications?.[nt.type]}
          onChange={(next) => setTypeSettings(nt.type, next)}
        />
      ))}

      {status ? (
        <Toast variant={status.type} onDismiss={clearStatus}>
          {status.message}
        </Toast>
      ) : null}

      <div className="pt-3">
        <Button
          variant="default"
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
