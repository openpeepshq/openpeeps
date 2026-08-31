import { CheckCheck, Settings2 } from 'lucide-react';
import { Button } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { markCachedNotificationsSeen } from '../../lib/notificationBadge';
import { useToast } from '../layout/ToastProvider';

/**
 * Translation of `core/notification/NotificationHeaderActions.svelte`.
 * Page-header actions for the notifications feed: mark every notification as
 * read and a link to the notification preferences screen.
 */
export function NotificationHeaderActions() {
  const t = useT();
  const { openpeepsApi, queryClient } = useOpenpeeps();
  const toast = useToast();
  const markAllNotificationsAsSeen =
    openpeepsApi.markAllNotificationsAsSeenAction()();

  const markAllRead = async () => {
    try {
      await markAllNotificationsAsSeen();
      markCachedNotificationsSeen(queryClient);
      toast.success(
        t('settings.notifications.markAllReadSuccess', {
          defaultValue: 'All notifications marked as read',
        }),
      );
    } catch {
      toast.error(
        t('notification.markAllReadError', {
          defaultValue: 'Failed to mark notifications as read',
        }),
      );
    }
  };

  return (
    <>
      <Button
        title={t('settings.notifications.feedPreferences.markAllRead', {
          defaultValue: 'Mark all as read',
        })}
        action={markAllRead}
        variant="outline"
      >
        <CheckCheck size={18} />
      </Button>
      <Button
        title={t('settings.notifications.headerPreferencesTitle', {
          defaultValue: 'Notification preferences',
        })}
        action="/settings/notifications/preferences"
        variant="outline"
      >
        <Settings2 size={18} />
      </Button>
    </>
  );
}
