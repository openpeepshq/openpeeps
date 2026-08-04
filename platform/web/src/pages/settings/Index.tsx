import { ChevronRight } from 'lucide-react';
import { Button } from '@openpeepshq/react-ui';
import { isOwnerProfile } from '@openpeepshq/common';
import { useT, useSetPageHeader } from '@openpeepshq/react';
import { useCurrentProfile, useServerInfo } from '@openpeepshq/react/components';

interface ConfigMenuButtonProps {
  translationPrefix: string;
  action: string;
  testId?: string;
}

function ConfigMenuButton({
  translationPrefix,
  action,
  testId,
}: ConfigMenuButtonProps) {
  const t = useT();
  return (
    <Button
      className="hover:bg-muted flex w-full items-center justify-between px-4 py-3 text-start"
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

export function Settings() {
  const profile = useCurrentProfile();
  const serverInfo = useServerInfo();

  useSetPageHeader('Settings', undefined, 'settings-page-heading');

  const stripeMembershipEnabled =
    !!serverInfo.payments?.stripe?.paidMembership?.enabled &&
    !(profile && isOwnerProfile(profile));

  return (
    <div className="p-4">
      <ConfigMenuButton
        translationPrefix="settings.publicProfile"
        action="/settings/public-profile"
        testId="settings-link-public-profile"
      />
      <ConfigMenuButton
        translationPrefix="settings.account"
        action="/settings/account"
        testId="settings-link-account"
      />
      <ConfigMenuButton
        translationPrefix="settings.notifications"
        action="/settings/notifications"
        testId="settings-link-notifications"
      />
      <ConfigMenuButton
        translationPrefix="settings.accessTokens"
        action="/settings/access-tokens"
      />
      <ConfigMenuButton
        translationPrefix="settings.theme"
        action="/settings/theme"
        testId="settings-link-theme"
      />
      <ConfigMenuButton
        translationPrefix="settings.language"
        action="/settings/language"
      />
      {stripeMembershipEnabled && (
        <ConfigMenuButton
          translationPrefix="settings.billing"
          action="/settings/billing"
          testId="settings-link-billing"
        />
      )}
    </div>
  );
}
