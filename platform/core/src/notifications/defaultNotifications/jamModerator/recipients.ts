/** Moderators who should get an invite: not the creator, and not already invited. */
export const jamModeratorsToNotify = (
  moderatorIds: string[] | undefined,
  creatorId: string,
  alreadyInvited: readonly string[] = [],
): string[] => {
  const skip = new Set([creatorId, ...alreadyInvited]);
  return [...new Set(moderatorIds ?? [])].filter((id) => id && !skip.has(id));
};
