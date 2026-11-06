import { useCallback, useMemo } from 'react';
import { useOpenpeeps } from '../../contexts/openpeeps';

/**
 * Controls which notification types are visible in the notifications feed.
 * Display only — hidden types are still created and counted, they are simply
 * not rendered in the feed. Persisted in profile settings
 * (`hiddenNotificationTypes`).
 */
export const useNotificationFeedFilter = () => {
  const { openpeepsApi } = useOpenpeeps();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const updateSettings = openpeepsApi.updateCurrentProfileSettingsAction();
  const typesQuery = openpeepsApi.useCurrentProfileNotificationTypes();

  const hiddenTypes = useMemo<ReadonlySet<string>>(
    () => new Set(settingsQuery.data?.hiddenNotificationTypes ?? []),
    [settingsQuery.data?.hiddenNotificationTypes],
  );

  const isHidden = useCallback(
    (type: string) => hiddenTypes.has(type),
    [hiddenTypes],
  );

  const toggle = useCallback(
    async (type: string) => {
      const current = settingsQuery.data;
      if (!current) return;
      const next = new Set(current.hiddenNotificationTypes ?? []);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      await updateSettings({
        ...current,
        hiddenNotificationTypes: [...next],
      });
    },
    [settingsQuery.data, updateSettings],
  );

  const showAll = useCallback(async () => {
    const current = settingsQuery.data;
    if (!current?.hiddenNotificationTypes?.length) return;
    await updateSettings({ ...current, hiddenNotificationTypes: [] });
  }, [settingsQuery.data, updateSettings]);

  return {
    types: typesQuery.data ?? [],
    hiddenTypes,
    isHidden,
    toggle,
    showAll,
    hasFilter: hiddenTypes.size > 0,
  };
};
