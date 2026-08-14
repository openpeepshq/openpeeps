import { useT, useSetPageHeader } from '../../index';
import { ConfigMenuButton } from '../../components';

export function NotificationSettings() {
  const t = useT();

  useSetPageHeader(
    t('settings.notifications.title', { defaultValue: 'Notifications' }),
    undefined,
    'notifications-page-heading',
  );

  return (
    <nav
      aria-label={t('settings.notifications.title', {
        defaultValue: 'Notifications',
      })}
      className="p-4"
    >
      <ConfigMenuButton
        translationPrefix="settings.notifications.preferences"
        action="/settings/notifications/preferences"
        testId="settings-notifications-preferences-link"
      />
      <ConfigMenuButton
        translationPrefix="settings.notifications.pushEnabledDevices"
        action="/settings/notifications/push-enabled-devices"
        testId="settings-notifications-push-devices-link"
      />
    </nav>
  );
}
