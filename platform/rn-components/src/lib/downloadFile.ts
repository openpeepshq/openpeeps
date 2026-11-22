import { Linking } from 'react-native';

/**
 * Open a URL in an external handler (the OS/browser) so the user can download
 * it. Returns `true` when the URL could be handed off, or `false` when no app
 * can open it — callers surface that to the user (e.g. Android 11+ where
 * `canOpenURL` for `https` can return `false` without a `<queries>` manifest
 * declaration).
 */
export const downloadDocument = async (url: string): Promise<boolean> => {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
};
