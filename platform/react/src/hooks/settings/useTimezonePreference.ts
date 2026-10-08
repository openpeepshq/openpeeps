import { useEffect, useState } from 'react';
import { resolveTimeZone } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n/context';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { useServerInfo } from '../../components/server-data';

export type SettingsStatus = {
  type: 'success' | 'error';
  message: string;
} | null;

export const useTimezonePreference = () => {
  const t = useT();
  const profile = useCurrentProfile();
  const serverInfo = useServerInfo();
  const { openpeepsApi } = useOpenpeeps();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const updateSettings = openpeepsApi.updateCurrentProfileSettingsAction();

  const communityDefaultTimeZone = resolveTimeZone(
    undefined,
    serverInfo.communityConfig?.settings?.defaultTimeZone,
  );

  const [timeZone, setTimeZone] = useState(communityDefaultTimeZone);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<SettingsStatus>(null);

  useEffect(() => {
    setTimeZone(settingsQuery.data?.timeZone ?? communityDefaultTimeZone);
  }, [settingsQuery.data?.timeZone, communityDefaultTimeZone]);

  const save = async () => {
    if (!profile) return;
    setStatus(null);
    setSaving(true);
    try {
      await updateSettings({ id: profile.id, timeZone });
      setStatus({
        type: 'success',
        message: t('settings.timezone.updateSuccess', {
          defaultValue: 'Timezone updated.',
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
    timeZone,
    setTimeZone,
    communityDefaultTimeZone,
    saving,
    status,
    clearStatus: () => setStatus(null),
    save,
  };
};
