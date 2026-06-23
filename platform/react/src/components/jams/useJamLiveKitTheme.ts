import { getTheme } from '@openpeeps/common/lib';
import { useCurrentProfileSettings } from '../layout/IdentityContext';
import { useServerInfo } from '../server-data/context';

export type JamLiveKitTheme = 'default' | 'light';

/** LiveKit theme name matching the user's OpenPeeps light/dark preference. */
export const useJamLiveKitTheme = (): JamLiveKitTheme => {
  const serverInfo = useServerInfo();
  const profileSettings = useCurrentProfileSettings();
  const userTheme = getTheme(serverInfo.communityConfig, profileSettings);
  return userTheme.dark ? 'default' : 'light';
};
