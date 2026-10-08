import { useEffect, useState } from 'react';
import type { ThemeOptions } from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../../components/layout/IdentityContext';

export const useThemePreference = () => {
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const updateSettings = openpeepsApi.updateCurrentProfileSettingsAction();
  const [theme, setTheme] = useState<ThemeOptions | undefined>(
    settingsQuery.data?.theme,
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (settingsQuery.data?.theme) setTheme(settingsQuery.data.theme);
  }, [settingsQuery.data?.theme]);

  const save = async () => {
    if (!me) return;
    setSubmitting(true);
    try {
      await updateSettings({ id: me.id, theme });
    } finally {
      setSubmitting(false);
    }
  };

  return { me, theme, setTheme, submitting, save };
};
