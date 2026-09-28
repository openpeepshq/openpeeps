/**
 * Fallback rendering shared by Avatar and GroupAvatar: letter initials on a
 * background derived from the handle.
 */

export const getInitials = (displayName?: string, handle?: string): string => {
  const name = displayName || handle || '?';
  const parts = name.split(' ');
  return [parts.at(0), parts.at(-1)]
    .filter(Boolean)
    .map((part) => part?.substring(0, 1).toUpperCase())
    .join('');
};

// Deterministic 0-359 hue from the handle so each account keeps a stable
// background color across sessions and between light and dark mode.
export const hueFromHandle = (handle: string): number => {
  let hash = 0;
  for (const char of handle) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % 360;
};

// Same hue in both modes; dark mode uses muted dark shades, light mode pastels.
export const initialsBackground = (hue: number, dark: boolean): string =>
  dark ? `hsl(${hue} 30% 24%)` : `hsl(${hue} 50% 85%)`;
