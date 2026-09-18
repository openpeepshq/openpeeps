import type { CommunityConfig } from '../types';

/** Copy light-mode fields onto theme root for pre-0.1.45 clients. */
export const withLegacyThemeRoot = (
  theme: CommunityConfig['theme'],
): CommunityConfig['theme'] => ({
  primaryHex: theme.light.primaryHex,
  logoSmall: theme.light.logoSmall,
  defaultProfileAvatar: theme.light.defaultProfileAvatar,
  defaultGroupAvatar: theme.light.defaultGroupAvatar,
  backgroundAuth: theme.light.backgroundAuth,
  background: theme.light.background,
  ...theme,
});
