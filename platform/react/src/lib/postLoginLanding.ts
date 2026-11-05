import type { CommunityConfig } from '@openpeepshq/common/types';

/**
 * Default web page after a successful login. Communities can opt into the
 * welcome page via `settings.landingPage`; otherwise the local feed.
 */
export const postLoginLandingPath = (config?: CommunityConfig) =>
  config?.settings?.landingPage === 'welcome' ? '/welcome' : '/feeds/local';
