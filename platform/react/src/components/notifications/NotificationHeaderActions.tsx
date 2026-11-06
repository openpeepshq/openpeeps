import { CheckCheck, Settings2, SlidersHorizontal } from 'lucide-react';
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { markCachedNotificationsSeen } from '../../lib/notificationBadge';
import { useToast } from '../layout/ToastProvider';
import { useNotificationFeedFilter } from '../../hooks';

/**
 * Translation of `core/notification/NotificationHeaderActions.svelte`.
 * Page-header actions for the notifications feed: mark every notification as
 * read, a type filter for the feed, and a link to the notification
 * preferences screen.
 */
export function NotificationHeaderActions() {
  const t = useT();
  const { openpeepsApi, queryClient } = useOpenpeeps();
  const toast = useToast();
  const filter = useNotificationFeedFilter();
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

  const filterTitle = t('notification.filter.title', {
    defaultValue: 'Filter notifications',
  });

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            title={filterTitle}
            variant="outline"
            data-testid="notifications-filter"
          >
            <SlidersHorizontal size={18} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="max-h-96 w-64 overflow-y-auto"
        >
          <DropdownMenuLabel>{filterTitle}</DropdownMenuLabel>
          {filter.types.map((nt) => (
            <DropdownMenuItem
              key={nt.type}
              onSelect={() => void filter.toggle(nt.type)}
              data-testid={`notifications-filter-${nt.type}`}
            >
              <Checkbox
                checked={!filter.isHidden(nt.type)}
                tabIndex={-1}
                className="pointer-events-none"
              />
              {t(`settings.notifications.types.${nt.type}.label`, {
                defaultValue: nt.type,
              })}
            </DropdownMenuItem>
          ))}
          {filter.hasFilter ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => void filter.showAll()}
                data-testid="notifications-filter-show-all"
              >
                {t('notification.filter.showAll', {
                  defaultValue: 'Show all types',
                })}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
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
