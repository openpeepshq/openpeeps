import { DbPost, OffsetInfiniteQueryParams, PostWithMeta, ProfileWithMeta } from "@openpeeps/common/types";
import { allpeepDb } from "../db";
import { filterAndTransform } from "../db/helpers";
import { canReadPost, transformPost } from "../posts/helpers";
import { capabilitiesConfig } from "../config";
import { eventSearchMapping, groupSearchMapping, jamSearchMapping, postSearchMapping, profileSearchMapping } from "./mapping";
import { queryParamsToLimit } from "./helpers";
import { WithId } from "@openpeeps/arango-querybuilder";




export const searchGroups = async (query: string, profile: ProfileWithMeta, limit: OffsetInfiniteQueryParams = { offset: 0, limit: 15 }) => {
    const { db } = await allpeepDb();
    return groupSearchMapping(profile, query).limit(queryParamsToLimit(limit)).all(db);
}

export const searchProfiles = async (query: string, profile: ProfileWithMeta, limit: OffsetInfiniteQueryParams = { offset: 0, limit: 15 }) => {
    const { db } = await allpeepDb();
    return profileSearchMapping(profile, query).limit(queryParamsToLimit(limit)).all(db);
}

const canReadPostFilter = async (profile: ProfileWithMeta) => {
    const postFilter = canReadPost(await capabilitiesConfig(), profile);
    return (item: { data: PostWithMeta }) => {
        return postFilter(item.data);
    }
}

const transformPostWithScore = (profile: ProfileWithMeta) => async (item: { data: WithId<DbPost>, score: number }) => {
    return { data: await transformPost(item.data, profile), score: item.score };
}

export const searchPosts = async (query: string, profile: ProfileWithMeta, limitOffset: OffsetInfiniteQueryParams = { offset: 0, limit: 15 }) =>
    filterAndTransform(
        postSearchMapping(profile, query),
        (await allpeepDb()).db,
        {
            transform: transformPostWithScore(profile),
            filter: await canReadPostFilter(profile),
            ...limitOffset
        });

export const searchEvents = async (query: string, profile: ProfileWithMeta, limitOffset: OffsetInfiniteQueryParams = { offset: 0, limit: 15 }) =>
    filterAndTransform(
        eventSearchMapping(profile, query),
        (await allpeepDb()).db,
        {
            transform: transformPostWithScore(profile),
            filter: await canReadPostFilter(profile),
            ...limitOffset
        });

export const searchJams = async (query: string, profile: ProfileWithMeta, limitOffset: OffsetInfiniteQueryParams = { offset: 0, limit: 15 }) =>
    filterAndTransform(
        jamSearchMapping(profile, query),
        (await allpeepDb()).db,
        {
            transform: transformPostWithScore(profile),
            filter: await canReadPostFilter(profile),
            ...limitOffset
        });

export const searchResultCounts = async (query: string, profile: ProfileWithMeta) => {
    const { db } = await allpeepDb();
    return {
        groups: await groupSearchMapping(profile, query).count(db),
        profiles: await profileSearchMapping(profile, query).count(db),
        posts: await searchPosts(query, profile, { limit: 100 }).then(posts => posts.length),
        events: await searchEvents(query, profile, { limit: 100 }).then(events => events.length),
        jams: await searchJams(query, profile, { limit: 100 }).then(jams => jams.length),
    }
}