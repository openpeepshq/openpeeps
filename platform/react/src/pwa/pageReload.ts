const JAM_ROOM_PATH_RE = /^\/events\/[^/]+\/jam\/?$/;

let deferred = false;

/** Remember a reload that must wait until the jam route is left. */
export const deferPageReload = (): void => {
  deferred = true;
};

/** Live jam route. A reload here drops the in-memory LiveKit session. */
export const isJamRoomPath = (pathname: string): boolean =>
  JAM_ROOM_PATH_RE.test(pathname);

export const inJamRoom = (): boolean =>
  typeof window !== 'undefined' && isJamRoomPath(window.location.pathname);

/**
 * Reload immediately, or remember it until the jam route is left.
 * Returns whether a reload was started.
 */
export const requestPageReload = (
  reload: () => void,
  isInJam: () => boolean = inJamRoom,
): boolean => {
  if (isInJam()) {
    deferred = true;
    return false;
  }
  deferred = false;
  reload();
  return true;
};

/** Apply a reload that was skipped because a jam was open. */
export const flushDeferredPageReload = (
  reload: () => void,
  isInJam: () => boolean = inJamRoom,
): boolean => {
  if (!deferred || isInJam()) return false;
  deferred = false;
  reload();
  return true;
};
