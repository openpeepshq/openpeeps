/** One notification per person. The member who canceled is not notified. */
export const rsvpCancelRecipients = <T extends { id: string }>(
  profiles: T[],
  actorId: string,
): T[] => {
  const seen = new Set<string>();
  return profiles.filter((profile) => {
    if (!profile.id || profile.id === actorId || seen.has(profile.id)) {
      return false;
    }
    seen.add(profile.id);
    return true;
  });
};
