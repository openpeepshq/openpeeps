import { ChevronRight } from 'lucide-react';
import { Button } from '@openpeeps/react-ui';
import { useT } from '@openpeeps/react';

interface MenuButtonProps {
  translationPrefix: string;
  action: string;
}

function MenuButton({ translationPrefix, action }: MenuButtonProps) {
  const t = useT();
  return (
    <Button
      className="hover:bg-surface-100 flex w-full items-center justify-between px-4 py-3 text-start"
      action={action}
    >
      <div>
        <div className="font-medium">{t(`${translationPrefix}.title`)}</div>
        <div className="text-surface-500 text-xs">
          {t(`${translationPrefix}.description`)}
        </div>
      </div>
      <span aria-hidden="true">
        <ChevronRight className="h-4 w-4" />
      </span>
    </Button>
  );
}

export function NotificationSettings() {
  const t = useT();

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-semibold">
        {t('settings.notifications.title', { defaultValue: 'Notifications' })}
      </h1>
      <MenuButton
        translationPrefix="settings.notifications.preferences"
        action="/settings/notifications/preferences"
      />
      <MenuButton
        translationPrefix="settings.notifications.pushEnabledDevices"
        action="/settings/notifications/push-enabled-devices"
      />
    </div>
  );
}
