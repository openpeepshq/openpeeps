import { useCallback, useMemo } from 'react';
import type { ProfileSettings } from '@openpeepshq/common/types';
import { useOpenpeeps } from '../../contexts/openpeeps';

/**
 * Controls which notification types are visible in the notifications feed.
 * Display only — hidden types are still created and counted; the feed query
 * excludes them via `excludeTypes`. Persisted in profile settings
 * (`hiddenNotificationTypes`).
 */
export const useNotificationFeedFilter = () => {
  const { openpeepsApi, queryClient, client } = useOpenpeeps();
  const settingsQuery = openpeepsApi.useCurrentProfileSettings();
  const updateSettings = openpeepsApi.updateCurrentProfileSettingsAction();
  const typesQuery = openpeepsApi.useCurrentProfileNotificationTypes();
  const settingsQueryKey = useMemo(
    () => client.profiles.current.readSettings.queryKey({}),
    [client],
  );

  const hiddenTypes = useMemo<ReadonlySet<string>>(
    () => new Set(settingsQuery.data?.hiddenNotificationTypes ?? []),
    [settingsQuery.data?.hiddenNotificationTypes],
  );

  const isHidden = useCallback(
    (type: string) => hiddenTypes.has(type),
    [hiddenTypes],
  );

  // Read the latest settings from the query cache rather than the render
  // closure: the settings query only refreshes once a PUT lands, so two rapid
  // toggles must each build on the previous toggle's optimistic write.
  const latestSettings = useCallback(
    () =>
      queryClient.getQueryData<ProfileSettings>(settingsQueryKey) ??
      settingsQuery.data,
    [queryClient, settingsQueryKey, settingsQuery.data],
  );

  const commitSettings = useCallback(
    async (updated: ProfileSettings) => {
      const previous = latestSettings();
      queryClient.setQueryData(settingsQueryKey, updated);
      try {
        await updateSettings(updated);
      } catch (error) {
        // The query cache now holds an optimistic value the server rejected.
        if (previous) {
          queryClient.setQueryData(settingsQueryKey, previous);
        }
        throw error;
      }
    },
    [queryClient, settingsQueryKey, updateSettings, latestSettings],
  );

  const toggle = useCallback(
    async (type: string) => {
      const current = latestSettings();
      if (!current) return;
      const next = new Set(current.hiddenNotificationTypes ?? []);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      await commitSettings({
        ...current,
        hiddenNotificationTypes: [...next],
      });
    },
    [latestSettings, commitSettings],
  );

  const showAll = useCallback(async () => {
    const current = latestSettings();
    if (!current?.hiddenNotificationTypes?.length) return;
    await commitSettings({ ...current, hiddenNotificationTypes: [] });
  }, [latestSettings, commitSettings]);

  // Sorted for a stable query key regardless of settings array order.
  const excludeTypes = useMemo(
    () => (hiddenTypes.size ? [...hiddenTypes].sort().join(',') : undefined),
    [hiddenTypes],
  );

  return {
    types: typesQuery.data ?? [],
    hiddenTypes,
    isHidden,
    toggle,
    showAll,
    hasFilter: hiddenTypes.size > 0,
    excludeTypes,
  };
};
