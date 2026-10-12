import { useEffect, useState } from 'react';
import type { GroupNotificationLevel } from '@openpeepshq/common';
import { useOpenpeeps } from '../../contexts/openpeeps';

export const useGroupNotificationLevel = (groupId: string) => {
  const { openpeepsApi } = useOpenpeeps();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const updateSettings = openpeepsApi.updateCurrentProfileSettingsAction();
  const [level, setLevel] = useState<GroupNotificationLevel>('all');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings || ready) return;
    setLevel(settings.groupNotificationLevels?.[groupId] ?? 'all');
    setReady(true);
  }, [settingsQuery.data, groupId, ready]);

  const save = async () => {
    const current = settingsQuery.data;
    if (!current) return false;
    setError(null);
    setSaving(true);
    try {
      const groupNotificationLevels = {
        ...(current.groupNotificationLevels ?? {}),
      };
      if (level === 'all') {
        delete groupNotificationLevels[groupId];
      } else {
        groupNotificationLevels[groupId] = level;
      }
      await updateSettings({
        ...current,
        groupNotificationLevels,
      });
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    level,
    setLevel,
    save,
    saving,
    ready: ready && !settingsQuery.isLoading,
    loadFailed: settingsQuery.isError,
    error,
  };
};
