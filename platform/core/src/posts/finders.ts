import { PostWithMeta, Post, PostType, Profile, DbPost, DbBasePost, UnseenPostCounts } from "@openpeeps/common/types";
import { ProfileWithMeta } from "@openpeeps/common/types";
import { allpeepDb, collectionInfos } from "../db";
import { contextRelation, conversationLeavesMappingForProfile, postsMappingForProfile, repostsOfPostRelationForProfile, postIdsMapping } from "./mapping";
import { audienceConnectionFinder, currentEventsFilter, jamFilter, localFeedFilter, mentionsConnectionFinder, myEventsFilter, myFeedFilter, myFeedGroupMembershipFilter, pastEventsFilter, toFilteredPostsList, transformPost, upcomingEventsFilter } from "./helpers";
import { Mapping, ObjectSort, OMFilter } from "@openpeeps/arango-querybuilder";
import { addQuerySort, addStart, sortOldestFirst } from "../db/helpers";
import { findHashtagByTag, hashtagsMapping } from "../hashtags";
import { findGroup } from "../groups/finders";
import { groupsMapping } from "../groups/mapping";
import { profilesMapping } from "../profiles/mapping";

export const findPost = async (id: string, profile?: ProfileWithMeta): Promise<PostWithMeta | undefined> =>
    allpeepDb().then(({ db }) => postsMappingForProfile(profile).find(db, id)).then(post => post ? transformPost(post, profile) : undefined);

export const postContext = async (profile: ProfileWithMeta | undefined, id: string, depth: number, direction: 'ancestors' | 'descendents', contextMapping?: Mapping<DbPost>) =>
    toFilteredPostsList(postsMappingForProfile(profile).relationsFrom({ id }, contextRelation(depth, direction, contextMapping ?? postsMappingForProfile(profile))), { profile });


export const descendents = async (profile: ProfileWithMeta | undefined, post: PostWithMeta, depth: number, contextMapping?: Mapping<DbPost>) =>
    postContext(profile, post.id, depth, 'descendents', contextMapping);

export const ancestors = async (profile: ProfileWithMeta | undefined, post: PostWithMeta, depth: number, contextMapping?: Mapping<DbPost>) =>
    postContext(profile, post.id, depth, 'ancestors', contextMapping);

export const replies = async (profile: ProfileWithMeta | undefined, post: PostWithMeta) =>
    descendents(profile, post, 1);

export const baseListPosts = ({ start, profile }: { start?: string, profile?: ProfileWithMeta }) =>
    addStart<DbPost>(postsMappingForProfile(profile), start);

export const baseFeed = ({ start, sort, profile }: { start?: string, sort?: ObjectSort, profile?: ProfileWithMeta }) =>
    addQuerySort(baseListPosts({ start, profile }).filter('DOC.visibility != "direct"'), sort);

export const baseEventsFeed = (profile?: ProfileWithMeta) => {
    const mapping = postsMappingForProfile(profile)
        .sort([['DOC.data.start', 'ASC']])
        .filter({ matches: { type: "event" } });
    return mapping;
}

export const listPosts = async (profile: ProfileWithMeta | undefined, { start, limit = 100, filter }: { start?: string, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(baseListPosts({ start, profile }).filter(filter), { profile, limit });

export const listConversationLeaves = async (profile: ProfileWithMeta) =>
    toFilteredPostsList(profilesMapping.relationsFrom(profile, {
        alias: 'posts',
        edgeCollection: collectionInfos.audienceCollection.name,
        direction: 'INBOUND',
        skipEdge: true,
        cardinality: 'many',
        mapping: conversationLeavesMappingForProfile(profile).data(),
    }), { profile, limit: 9999 })


export const listPostsByProfile = async (profile: ProfileWithMeta | undefined, requestedProfile: ProfileWithMeta, { start, limit = 100, filter }: { start?: string, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(profilesMapping.relationsFrom(requestedProfile, {
        alias: 'posts',
        edgeCollection: collectionInfos.entriesCollection.name,
        direction: 'OUTBOUND',
        edgeFilter: 'DOC.type == "create"',
        skipEdge: true,
        cardinality: 'many',
        mapping: baseFeed({ start, profile }).filter(filter).data(),
    }), { profile, limit });

export const listBookmarkedPosts = async (profile: ProfileWithMeta | undefined, requestedProfile: ProfileWithMeta, { start, limit = 100, filter }: { start?: string, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(profilesMapping.relationsFrom(requestedProfile, {
        alias: 'posts',
        edgeCollection: collectionInfos.bookmarksCollection.name,
        direction: 'OUTBOUND',
        skipEdge: true,
        cardinality: 'many',
        mapping: baseFeed({ start, profile }).filter(filter).data(),
    }), { profile, limit });

export const listBookmarkedPostIds = async (requestedProfile: ProfileWithMeta): Promise<string[]> => {
    const { db } = await allpeepDb();
    return profilesMapping.relationsFrom(requestedProfile, {
        alias: 'posts',
        edgeCollection: collectionInfos.bookmarksCollection.name,
        direction: 'OUTBOUND',
        skipEdge: true,
        cardinality: 'many',
        mapping: postIdsMapping.data(),
    }).all(db).then((posts: { id: string }[]) => posts.map(p => p.id));
}

export const getUnseenPostCounts = async (profile: ProfileWithMeta): Promise<UnseenPostCounts> => {
    const groupIds = profile.memberships
        .map((membership) => membership.group.id)
        .filter((groupId): groupId is string => typeof groupId === 'string');
    const groups = Object.fromEntries(groupIds.map((groupId) => [groupId, 0]));

    await Promise.all(groupIds.map(async (groupId) => {
        const posts = await listPostsByGroup(profile, groupId, { limit: 9999 });
        groups[groupId] = posts.filter((post) => post.seen === false && post.profile.id !== profile.id).length;
    }));

    const conversations = await Promise.all(
        (await listConversationLeaves(profile)).map((post) => getConversationByEnd(post, profile))
    );
    const uniqueConversations = Array.from(new Map(
        conversations
            .filter((conversation) => conversation[0])
            .map((conversation) => [conversation[0].id, conversation])
    ).values());
    const direct = uniqueConversations.reduce(
        (sum, conversation) =>
            sum + conversation.filter((post) => post.seen === false && post.profile.id !== profile.id).length,
        0
    );

    return { groups, direct };
}



export const listPostsByType = async (profile: ProfileWithMeta | undefined, type: PostType, { start, limit = 100, filter }: { start?: string, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(baseFeed({ start, profile }).filter(filter).filter({ matches: { type } }), { profile, limit });


export const listPostsByTag = async (profile: ProfileWithMeta | undefined, tag: string, { start, limit = 100, filter }: { start?: string, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) => {
    const hashtag = await findHashtagByTag(tag);
    if (!hashtag) {
        return [];
    }
    return toFilteredPostsList(hashtagsMapping.relationsFrom(hashtag, {
        alias: 'posts',
        edgeCollection: collectionInfos.postHashtagsCollection.name,
        direction: 'INBOUND',
        cardinality: 'many',
        skipEdge: true,
        mapping: baseFeed({ start, profile }).filter(filter).data(),
    }), { profile, limit });

}

export const listPostsByGroup = async (profile: ProfileWithMeta | undefined, groupId: string, { start, limit = 100, filter, sort }: { start?: string, limit?: number, filter?: OMFilter<DbBasePost>, sort?: ObjectSort } = { limit: 100 }) => {
    const group = await findGroup(groupId);
    if (!group) {
        return [];
    }
    return toFilteredPostsList(groupsMapping.relationsFrom(group, {
        alias: 'posts',
        edgeCollection: collectionInfos.postGroupsCollection.name,
        direction: 'INBOUND',
        skipEdge: true,
        cardinality: 'many',
        mapping: baseFeed({ start, profile }).filter(filter).data(),
    }), { profile, limit });
}

export const listUpcomingEventsFeed = async (profile: ProfileWithMeta | undefined, { offset, limit = 100, filter }: { offset?: number, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(baseEventsFeed(profile)
        .filter(upcomingEventsFilter())
        .filter(filter), { profile, limit, offset });

export const listCurrentEventsFeed = async (profile: ProfileWithMeta | undefined, { offset, limit = 100, filter }: { offset?: number, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(baseEventsFeed(profile)
        .filter(currentEventsFilter())
        .filter(filter), { profile, limit, offset });

export const listPastEventsFeed = async (profile: ProfileWithMeta | undefined, { offset, limit = 100, filter }: { offset?: number, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(baseEventsFeed(profile)
        .sort([['DOC.data.start', 'DESC']])
        .filter(pastEventsFilter())
        .filter(filter), { profile, limit, offset });

export const listMyUpcomingEventsFeed = async (profile: ProfileWithMeta, { offset, limit = 100 }: { offset?: number, limit?: number } = { limit: 100 }) =>
    listUpcomingEventsFeed(profile, { offset, filter: myEventsFilter(profile), limit });

export const listMyCurrentEventsFeed = async (profile: ProfileWithMeta, { offset, limit = 100 }: { offset?: number, limit?: number } = { limit: 100 }) =>
    listCurrentEventsFeed(profile, { offset, filter: myEventsFilter(profile), limit });

export const listMyPastEventsFeed = async (profile: ProfileWithMeta, { offset, limit = 100 }: { offset?: number, limit?: number } = { limit: 100 }) =>
    listPastEventsFeed(profile, { offset, filter: myEventsFilter(profile), limit });

export const listUpcomingJamsFeed = async (profile: ProfileWithMeta | undefined, { offset, limit = 100 }: { offset?: number, limit?: number } = { limit: 100 }) =>
    listUpcomingEventsFeed(profile, { offset, filter: jamFilter, limit });

export const listPastJamsFeed = async (profile: ProfileWithMeta | undefined, { offset, limit = 100 }: { offset?: number, limit?: number } = { limit: 100 }) =>
    listPastEventsFeed(profile, { offset, filter: jamFilter, limit });

export const listMyPastJamsFeed = async (profile: ProfileWithMeta, { offset, limit = 100 }: { offset?: number, limit?: number } = { limit: 100 }) =>
    listPastEventsFeed(profile, { offset, filter: { operator: '&&', predicates: [myEventsFilter(profile), jamFilter] }, limit });

export const listMyUpcomingJamsFeed = async (profile: ProfileWithMeta, { offset, limit = 100 }: { offset?: number, limit?: number } = { limit: 100 }) =>
    listUpcomingEventsFeed(profile, { offset, filter: { operator: '&&', predicates: [myEventsFilter(profile), jamFilter] }, limit });


const baseGroupEventsFeed = async (profile: ProfileWithMeta | undefined, groupId: string, { filter, sort }: { filter?: OMFilter<DbBasePost>, sort?: ObjectSort } = {}) => {
    const group = await findGroup(groupId);
    if (!group) {
        throw new Error(`Group ${groupId} not found`);
    }
    return groupsMapping.relationsFrom(group, {
        alias: 'posts',
        edgeCollection: collectionInfos.postGroupsCollection.name,
        direction: 'INBOUND',
        skipEdge: true,
        cardinality: 'many',
        mapping: baseEventsFeed(profile).filter(filter).sort(sort).data(),
    });
}

export const listUpcomingGroupEventsFeed = async (profile: ProfileWithMeta | undefined, groupId: string, { offset, limit = 100 }: { offset?: number, limit?: number } = { limit: 100 }) =>
    toFilteredPostsList(await baseGroupEventsFeed(profile, groupId, { filter: upcomingEventsFilter() }), { profile, limit, offset });

export const listPastGroupEventsFeed = async (profile: ProfileWithMeta | undefined, groupId: string, { offset, limit = 100 }: { offset?: number, limit?: number } = { limit: 100 }) =>
    toFilteredPostsList(await baseGroupEventsFeed(profile, groupId, { filter: pastEventsFilter(), sort: [['DOC.data.start', 'DESC']] }), { profile, limit, offset });


export const listLocalFeed = async (profile: ProfileWithMeta | undefined, { start, limit = 100 }: { start?: string, limit?: number } = { limit: 100 }) =>
    toFilteredPostsList(baseFeed({ start, profile }).filter(localFeedFilter(profile)), { profile, limit });

export const listMyFeed = async (profile: ProfileWithMeta, { start, limit = 100 }: { start?: string, limit?: number } = { limit: 100 }) =>
    toFilteredPostsList(baseFeed({ start, profile }).filter(myFeedFilter(profile)), { profile, limit, filters: [myFeedGroupMembershipFilter(profile)] });

export const reposts = async (post: PostWithMeta, profile?: ProfileWithMeta) =>
    toFilteredPostsList(postsMappingForProfile(profile).relationsFrom(post, repostsOfPostRelationForProfile(profile)), { profile });

export const getConversationByEnd = async (post: PostWithMeta, profile: ProfileWithMeta) =>
    ancestors(profile, post, 9999, sortOldestFirst<DbPost>(postsMappingForProfile(profile)))
        .then((conversation) => [...conversation, post]);
export const getConversationByStart = async (post: PostWithMeta, profile: ProfileWithMeta) =>
    descendents(profile, post, 9999, sortOldestFirst<DbPost>(postsMappingForProfile(profile)))
        .then((conversation) => [post, ...conversation]);


export const mentions = async (post: Post, profile: Profile) =>
    allpeepDb().then(({ db }) => mentionsConnectionFinder(db, post, profile));

export const audience = async (post: Post, profile: Profile) =>
    allpeepDb().then(({ db }) => audienceConnectionFinder(db, post, profile));