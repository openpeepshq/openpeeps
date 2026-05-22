import { ChevronRight } from 'lucide-react';
import { Button } from '@openpeeps/react-ui';
import { isOwnerProfile } from '@openpeeps/common';
import { useT } from '@openpeeps/react';
import { useCurrentProfile, useServerInfo } from '@openpeeps/react/components';

interface ConfigMenuButtonProps {
  translationPrefix: string;
  action: string;
}

function ConfigMenuButton({ translationPrefix, action }: ConfigMenuButtonProps) {
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

export function Settings() {
  const profile = useCurrentProfile();
  const serverInfo = useServerInfo();

  const stripeMembershipEnabled =
    !!serverInfo.payments?.stripe?.paidMembership?.enabled &&
    !(profile && isOwnerProfile(profile));

  return (
    <div className="p-4">
      <ConfigMenuButton
        translationPrefix="settings.publicProfile"
        action="/settings/public-profile"
      />
      <ConfigMenuButton
        translationPrefix="settings.account"
        action="/settings/account"
      />
      <ConfigMenuButton
        translationPrefix="settings.notifications"
        action="/settings/notifications"
      />
      <ConfigMenuButton
        translationPrefix="settings.accessTokens"
        action="/settings/access-tokens"
      />
      <ConfigMenuButton
        translationPrefix="settings.theme"
        action="/settings/theme"
      />
      <ConfigMenuButton
        translationPrefix="settings.language"
        action="/settings/language"
      />
      {stripeMembershipEnabled && (
        <ConfigMenuButton
          translationPrefix="settings.billing"
          action="/settings/billing"
        />
      )}
    </div>
  );
}
