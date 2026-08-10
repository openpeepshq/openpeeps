import {
  AuthorizationData,
  DbPost,
  OffsetInfiniteQueryParams,
  PostWithMeta,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import { allpeepDb } from '../db';
import { filterAndTransform } from '../db/helpers';
import { canReadPost, transformPost } from '../posts/helpers';
import { capabilitiesConfig } from '../config';
import {
  eventSearchMapping,
  groupSearchMapping,
  jamSearchMapping,
  postSearchMapping,
  profileSearchMapping,
} from './mapping';
import { queryParamsToLimit } from './helpers';
import type { WithId } from '../db/pg/map/queryTypes';
import { withSpan } from '../performance';

const requireProfile = (authData: AuthorizationData): ProfileWithMeta => {
  if (!authData.profile) {
    throw new Error('AuthorizationData.profile is required for this finder');
  }
  return authData.profile;
};

export const searchGroups = async (
  query: string,
  authData: AuthorizationData,
  limit: OffsetInfiniteQueryParams = { offset: 0, limit: 15 },
) => {
  const { db } = await allpeepDb();
  return groupSearchMapping(requireProfile(authData), query)
    .limit(queryParamsToLimit(limit))
    .all(db);
};

export const searchProfiles = async (
  query: string,
  authData: AuthorizationData,
  limit: OffsetInfiniteQueryParams = { offset: 0, limit: 15 },
) =>
  withSpan('profiles.search', async () => {
    const { db } = await allpeepDb();
    return profileSearchMapping(requireProfile(authData), query)
      .limit(queryParamsToLimit(limit))
      .all(db);
  });

const canReadPostFilter = async (authData: AuthorizationData) => {
  const postFilter = canReadPost(await capabilitiesConfig(), authData);
  return (item: { data: PostWithMeta }) => {
    return postFilter(item.data);
  };
};

const transformPostWithScore =
  (profile: ProfileWithMeta) =>
  async (item: { data: WithId<DbPost>; score: number }) => {
    return { data: await transformPost(item.data, profile), score: item.score };
  };

export const searchPosts = async (
  query: string,
  authData: AuthorizationData,
  limitOffset: OffsetInfiniteQueryParams = { offset: 0, limit: 15 },
) =>
  withSpan('posts.search', async () => {
    const profile = requireProfile(authData);
    const { db } = await allpeepDb();
    const mapping = postSearchMapping(profile, query);

    return filterAndTransform(mapping, db, {
      transform: transformPostWithScore(profile),
      filter: await canReadPostFilter(authData),
      ...limitOffset,
    });
  });

export const searchEvents = async (
  query: string,
  authData: AuthorizationData,
  limitOffset: OffsetInfiniteQueryParams = { offset: 0, limit: 15 },
) => {
  const profile = requireProfile(authData);
  return filterAndTransform(
    eventSearchMapping(profile, query),
    (await allpeepDb()).db,
    {
      transform: transformPostWithScore(profile),
      filter: await canReadPostFilter(authData),
      ...limitOffset,
    },
  );
};

export const searchJams = async (
  query: string,
  authData: AuthorizationData,
  limitOffset: OffsetInfiniteQueryParams = { offset: 0, limit: 15 },
) => {
  const profile = requireProfile(authData);
  return filterAndTransform(
    jamSearchMapping(profile, query),
    (await allpeepDb()).db,
    {
      transform: transformPostWithScore(profile),
      filter: await canReadPostFilter(authData),
      ...limitOffset,
    },
  );
};

export const searchResultCounts = async (
  query: string,
  authData: AuthorizationData,
) => {
  const profile = requireProfile(authData);
  const { db } = await allpeepDb();
  return {
    groups: await groupSearchMapping(profile, query).count(db),
    profiles: await profileSearchMapping(profile, query).count(db),
    posts: await searchPosts(query, authData, { limit: 100 }).then(
      (posts) => posts.length,
    ),
    events: await searchEvents(query, authData, { limit: 100 }).then(
      (events) => events.length,
    ),
    jams: await searchJams(query, authData, { limit: 100 }).then(
      (jams) => jams.length,
    ),
  };
};
