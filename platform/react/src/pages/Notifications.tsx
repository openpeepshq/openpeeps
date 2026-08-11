import { useT, useSetPageHeader } from '../index';
import { NotificationsList, NotificationHeaderActions } from '../components';

export function Notifications() {
  const t = useT();
  useSetPageHeader(
    t('navigation.notifications', { defaultValue: 'Notifications' }),
    <NotificationHeaderActions />,
    'notifications-page-heading',
  );
  return (
    <div className="space-y-2 p-4">
      <NotificationsList />
    </div>
  );
}
