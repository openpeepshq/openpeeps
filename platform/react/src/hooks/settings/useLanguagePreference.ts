import { useEffect, useState } from 'react';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useI18n, useT } from '../../i18n/context';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { useServerInfo } from '../../components/server-data';
import type { SettingsStatus } from './useTimezonePreference';

export const useLanguagePreference = () => {
  const t = useT();
  const { i18n } = useI18n();
  const profile = useCurrentProfile();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const updateSettings = openpeepsApi.updateCurrentProfileSettingsAction();

  const communityDefaultLanguage =
    serverInfo.communityConfig?.settings?.defaultLanguage ?? 'en';

  const [language, setLanguage] = useState(communityDefaultLanguage);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<SettingsStatus>(null);

  useEffect(() => {
    if (settingsQuery.data?.language) {
      setLanguage(settingsQuery.data.language);
    }
  }, [settingsQuery.data?.language]);

  const save = async () => {
    if (!profile) return;
    setStatus(null);
    setSaving(true);
    try {
      await updateSettings({ id: profile.id, language });
      await i18n.changeLanguage(language);
      setStatus({
        type: 'success',
        message: t('settings.language.updateSuccess', {
          defaultValue: 'Language updated.',
        }),
      });
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return {
    profile,
    language,
    setLanguage,
    communityDefaultLanguage,
    saving,
    status,
    clearStatus: () => setStatus(null),
    save,
  };
};
