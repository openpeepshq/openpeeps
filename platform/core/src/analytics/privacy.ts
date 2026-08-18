/** Group body fields used to decide public vs private for analytics. */
export type AnalyticsGroupCapabilities = {
  capabilities?: { none?: { add?: string[] } };
};

/**
 * Public groups grant `core-groups-read` to role `none`. Missing capabilities
 * means private — same rule as the analytics group tables.
 */
export const isPublicAnalyticsGroup = (
  body: AnalyticsGroupCapabilities,
): boolean => (body.capabilities?.none?.add ?? []).includes('core-groups-read');

/**
 * Top-posts cards show author + snippet. Exclude DMs and any post linked to a
 * private group. A post with no group links is eligible when not `direct`.
 */
export const isAnalyticsTopPostEligible = (
  visibility: string,
  linkedGroupBodies: AnalyticsGroupCapabilities[],
): boolean =>
  visibility !== 'direct' && linkedGroupBodies.every(isPublicAnalyticsGroup);
