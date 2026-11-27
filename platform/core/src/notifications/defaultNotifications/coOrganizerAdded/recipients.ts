/**
 * Co-organizer ids that should get an "added" notification: those in `next`
 * that were not already co-organizers, excluding the sender (a co-organizer
 * adding themselves must not receive a self-notification).
 */
export const coOrganizersAddedToNotify = (
  nextIds: string[] | undefined,
  previousIds: readonly string[],
  senderId: string,
): string[] => {
  const skip = new Set([senderId, ...previousIds]);
  return [...new Set(nextIds ?? [])].filter((id) => id && !skip.has(id));
};
