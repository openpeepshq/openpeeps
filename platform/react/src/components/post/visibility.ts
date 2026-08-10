import type { VisibilityType } from '@openpeepshq/common';
import { useServerInfo } from '../server-data';

/**
 * Hook port of `@openpeepshq/svelte/utils/postHelpers.ts::getDefaultVisibility()`:
 * returns `'public'` when the community allows public content, `'local'`
 * otherwise.
 */
export const useDefaultVisibility = (): VisibilityType => {
  const serverInfo = useServerInfo();
  return serverInfo.publicContent ? 'public' : 'local';
};
