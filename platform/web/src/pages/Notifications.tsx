import { useT } from '@openpeeps/react';
import { NotificationsList } from '@openpeeps/react/components';

export function Notifications() {
  const t = useT();
  return (
    <div className="space-y-2 p-4">
      <h1 className="text-2xl font-semibold">
        {t('navigation.notifications', { defaultValue: 'Notifications' })}
      </h1>
      <NotificationsList />
    </div>
  );
}
