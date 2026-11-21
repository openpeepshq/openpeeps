/**
 * Group body fields used to decide public vs private for analytics.
 * A role-keyed capabilities record so a full `GroupWithMeta` (which carries
 * capabilities for every role) can be passed directly, not just a `none` slice.
 */
export type AnalyticsGroupCapabilities = {
  capabilities?: Record<string, { add?: string[]; remove?: string[] }>;
};

/**
 * Public groups grant `core-groups-read` to role `none`. A `remove` on the
 * same role wins over any add — missing capabilities means private.
 */
export const isPublicAnalyticsGroup = (
  body: AnalyticsGroupCapabilities,
): boolean => {
  const none = body.capabilities?.none ?? {};
  return (
    (none.add ?? []).includes('core-groups-read') &&
    !(none.remove ?? []).includes('core-groups-read')
  );
};

/**
 * Top-posts cards show author + snippet. Exclude DMs and any post linked to a
 * private group. A post with no group links is eligible when not `direct`.
 */
export const isAnalyticsTopPostEligible = (
  visibility: string,
  linkedGroupBodies: AnalyticsGroupCapabilities[],
): boolean =>
  visibility !== 'direct' && linkedGroupBodies.every(isPublicAnalyticsGroup);
