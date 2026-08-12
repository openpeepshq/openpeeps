import { isOwnerProfile } from '@openpeepshq/common';
import { useT, useSetPageHeader } from '../../index';
import {
  ConfigMenuButton,
  useCurrentProfile,
  useServerInfo,
} from '../../components';

export function Settings() {
  const t = useT();
  const profile = useCurrentProfile();
  const serverInfo = useServerInfo();

  useSetPageHeader('Settings', undefined, 'settings-page-heading');

  const stripeMembershipEnabled =
    !!serverInfo.payments?.stripe?.paidMembership?.enabled &&
    !(profile && isOwnerProfile(profile));

  return (
    <nav
      aria-label={t('settings.menu', { defaultValue: 'Settings' })}
      className="p-4"
    >
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
    </nav>
  );
}
