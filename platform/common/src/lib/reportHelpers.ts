/** True when the reporter is the reported profile or authored a reported post. */
export const isSelfReport = (
  reporterId: string,
  reportedProfileId: string,
  postAuthorIds: readonly string[],
): boolean =>
  reporterId === reportedProfileId || postAuthorIds.includes(reporterId);
