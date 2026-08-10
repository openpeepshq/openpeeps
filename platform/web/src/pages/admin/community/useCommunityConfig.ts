import { useMemo } from 'react';
import type { CommunityConfig } from '@openpeepshq/common/types';
import type { ConfigTree } from '@openpeepshq/common/types';
import { useOpenpeeps, diffConfigTrees } from '@openpeepshq/react';

/**
 * Mirrors the Svelte community config pages: load the effective
 * `openpeeps/community` config, edit a clone, and persist only the diff so we
 * never pin current defaults into the stored overrides.
 */
export function useCommunityConfig() {
  const { openpeepsApi } = useOpenpeeps();
  const query = openpeepsApi.admin.useConfigRead('openpeeps', 'community');
  const updateConfig = openpeepsApi.admin.updateConfigAction({
    namespace: 'openpeeps',
    name: 'community',
  });

  const base = query.data?.config as CommunityConfig | undefined;

  // A stable mutable clone the react-ui Form can mutate in place; it resets
  // whenever the underlying config changes (e.g. after a successful save).
  const draft = useMemo(() => (base ? structuredClone(base) : null), [base]);

  const save = (next: CommunityConfig) =>
    updateConfig({
      config: diffConfigTrees(
        base as unknown as ConfigTree,
        next as unknown as ConfigTree,
      ) as Partial<CommunityConfig>,
    });

  return {
    isLoading: query.isLoading,
    base,
    draft,
    save,
    updateConfig,
  };
}
