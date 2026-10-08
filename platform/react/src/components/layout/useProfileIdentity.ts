import { useEffect, useMemo } from 'react';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useI18n, resolveProfileLanguage } from '../../i18n';
import { useServerInfo } from '../server-data';
import type { IdentityContextValue } from './IdentityContext';

/**
 * Identity queries behind `ProfileProvider` (web) and `IdentityProvider`
 * (native). Applies the profile language to i18n as a side effect.
 */
export const useProfileIdentity = () => {
  const { openpeepsApi, currentProfile, currentAccount } = useOpenpeeps();
  const { i18n } = useI18n();
  const serverInfo = useServerInfo();
  const communityDefaultLanguage =
    serverInfo.communityConfig?.settings?.defaultLanguage;

  const profileQuery = openpeepsApi.useCurrentProfile?.();
  const accountQuery = openpeepsApi.useCurrentAccount?.();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings?.();

  const profileSettings = settingsQuery?.data;

  useEffect(() => {
    const lang = resolveProfileLanguage(
      profileSettings?.language,
      communityDefaultLanguage,
    );
    if (i18n.language === lang) return;
    void i18n.changeLanguage(lang);
  }, [profileSettings?.language, communityDefaultLanguage, i18n]);

  const value = useMemo<IdentityContextValue>(
    () => ({
      // Prefer react-query data so membership/role changes (e.g. after creating
      // a group) are not masked by the login-time `currentProfile` snapshot.
      profile: profileQuery?.data ?? currentProfile,
      account: accountQuery?.data ?? currentAccount,
      profileSettings,
    }),
    [
      currentProfile,
      currentAccount,
      profileQuery?.data,
      accountQuery?.data,
      profileSettings,
    ],
  );

  return { value, profileQuery, accountQuery, settingsQuery };
};
