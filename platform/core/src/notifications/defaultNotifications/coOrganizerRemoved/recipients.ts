/**
 * Co-organizer ids that should get a "removed" notification: those in
 * `previous` that are no longer in `next`, excluding the sender (a
 * co-organizer stepping down must not receive a self-notification).
 */
export const coOrganizersRemovedToNotify = (
  previousIds: readonly string[],
  nextIds: string[] | undefined,
  senderId: string,
): string[] => {
  const keep = new Set(nextIds ?? []);
  return [...new Set(previousIds)].filter(
    (id) => id && id !== senderId && !keep.has(id),
  );
};
