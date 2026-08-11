import { ChevronRight } from 'lucide-react';
import { Button } from '@openpeepshq/react-ui';
import { useT, useSetPageHeader } from '../../index';

interface MenuButtonProps {
  translationPrefix: string;
  action: string;
  testId?: string;
}

function MenuButton({ translationPrefix, action, testId }: MenuButtonProps) {
  const t = useT();
  return (
    <Button
      className="hover:bg-surface flex w-full items-center justify-between px-4 py-3 text-start"
      action={action}
      data-testid={testId}
    >
      <div>
        <div className="font-medium">{t(`${translationPrefix}.title`)}</div>
        <div className="text-muted-foreground text-xs">
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

  useSetPageHeader(
    t('settings.notifications.title', { defaultValue: 'Notifications' }),
    undefined,
    'notifications-page-heading',
  );

  return (
    <div className="p-4">
      <MenuButton
        translationPrefix="settings.notifications.preferences"
        action="/settings/notifications/preferences"
        testId="settings-notifications-preferences-link"
      />
      <MenuButton
        translationPrefix="settings.notifications.pushEnabledDevices"
        action="/settings/notifications/push-enabled-devices"
        testId="settings-notifications-push-devices-link"
      />
    </div>
  );
}
