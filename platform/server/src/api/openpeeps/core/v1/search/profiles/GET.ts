import { ensureLocalProfile } from '#lib/auth';
import {
  offsetInfiniteQueryParamsSchema,
  publicProfileSchema,
  searchResultSchema,
} from '@openpeepshq/common';
import {
  isRemoteIdentityQuery,
  PREPENDED_SCORE,
  resolveRemoteIdentity,
  searchProfiles,
} from '@openpeepshq/core/search';
import { endpoint, z } from '#lib/endpoint';
import { notFound } from '#lib/errors';
import { fedifyRemoteIdentityFetcher } from '#lib/remoteIdentityFetch';

export const Query = offsetInfiniteQueryParamsSchema.extend({
  q: z.string(),
});

export const Output = searchResultSchema(publicProfileSchema);

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Query }).handle(
  async (query, event) => {
    const authData = event.context.authData;
    await ensureLocalProfile(event);

    const params = offsetInfiniteQueryParamsSchema.parse(query);
    const results = await searchProfiles(query.q, authData, params);

    // A remote identity typed into search (e.g. `@alice@mastodon.social`) is
    // resolved via WebFinger + the actor document and stored, so a later
    // search finds it through the normal index. On the first page it is not
    // indexed yet, so the freshly resolved profile is prepended.
    if ((params.offset ?? 0) === 0 && isRemoteIdentityQuery(query.q)) {
      const remote = await resolveRemoteIdentity(
        query.q,
        fedifyRemoteIdentityFetcher,
      );
      if (remote) {
        // Compare on handle + domain (both sides), not handle alone: a local
        // profile that shares the bare handle (`alice` vs remote
        // `alice@mastodon.social`) is a distinct identity and must not be
        // treated as "already present". `activityPub.domain` is absent on
        // local results, so a local hit never matches a remote one.
        const alreadyPresent = results.some(
          (item) =>
            item.data.handle === remote.handle &&
            item.data.activityPub?.domain === remote.activityPub?.domain,
        );
        if (!alreadyPresent) {
          // `PREPENDED_SCORE` (not the plan's `1`) outranks any `ts_rank`
          // score, which is bounded to [0,1]: the exact resolved hit must
          // stay first no matter how search scoring later changes.
          results.unshift({ score: PREPENDED_SCORE, data: remote });
        }
      }
    }

    return results;
  },
);
