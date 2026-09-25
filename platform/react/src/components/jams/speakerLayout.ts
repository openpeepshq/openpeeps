/** Personal choice of who fills the stage. `follow` defers to a host spotlight. */
export type LocalSpeakerFocus =
  | { mode: 'follow' }
  | { mode: 'grid' }
  | { mode: 'pin'; identity: string };

/**
 * Who should fill the stage. A local pin wins over a host spotlight. An
 * explicit grid choice hides the spotlight for this attendee only. A pin or
 * spotlight whose participant has left resolves to the grid.
 */
export const enlargedIdentity = (
  focus: LocalSpeakerFocus,
  spotlightIdentity: string | null,
  presentIds: ReadonlySet<string>,
): string | null => {
  if (focus.mode === 'grid') return null;
  if (focus.mode === 'pin') {
    return presentIds.has(focus.identity) ? focus.identity : null;
  }
  if (spotlightIdentity && presentIds.has(spotlightIdentity)) {
    return spotlightIdentity;
  }
  return null;
};

/** Jam creator or a listed jam moderator. */
export const senderMaySpotlight = (
  identity: string | undefined,
  creatorId: string,
  moderatorIds: readonly string[],
) => !!identity && (identity === creatorId || moderatorIds.includes(identity));

/** `null` clears the spotlight. `undefined` means the payload was ignored. */
export const parseSpotlightPayload = (
  payload: Uint8Array,
): string | null | undefined => {
  try {
    const data = JSON.parse(new TextDecoder().decode(payload)) as {
      identity?: unknown;
    };
    if (data.identity === null) return null;
    if (typeof data.identity === 'string' && data.identity.length > 0) {
      return data.identity;
    }
    return undefined;
  } catch {
    return undefined;
  }
};
