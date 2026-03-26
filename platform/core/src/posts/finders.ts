import { PostWithMeta, Post, PostType, Profile, DbPost, DbBasePost } from "@openpeeps/common/types";
import { ProfileWithMeta } from "@openpeeps/common/types";
import { allpeepDb, collectionInfos } from "../db";
import { contextRelation, conversationLeavesMapping, postsMapping, repostsOfPostRelation, postIdsMapping } from "./mapping";
import { audienceConnectionFinder, currentEventsFilter, jamFilter, localFeedFilter, mentionsConnectionFinder, myEventsFilter, myFeedFilter, pastEventsFilter, toFilteredPostsList, transformPost, upcomingEventsFilter } from "./helpers";
import { Mapping, ObjectSort, OMFilter } from "@openpeeps/arango-querybuilder";
import { addQuerySort, addStart, sortOldestFirst } from "../db/helpers";
import { findHashtagByTag, hashtagsMapping } from "../hashtags";
import { findGroup } from "../groups/finders";
import { groupsMapping } from "../groups/mapping";
import { profilesMapping } from "../profiles/mapping";

export const findPost = async (id: string): Promise<PostWithMeta | undefined> =>
    allpeepDb().then(({ db }) => postsMapping.find(db, id)).then(post => post ? transformPost(post) : undefined);

export const postContext = async (profile: ProfileWithMeta | undefined, id: string, depth: number, direction: 'ancestors' | 'descendents', contextMapping?: Mapping<DbPost>) =>
    toFilteredPostsList(postsMapping.relationsFrom({ id }, contextRelation(depth, direction, contextMapping)), { profile });


export const descendents = async (profile: ProfileWithMeta | undefined, post: PostWithMeta, depth: number, contextMapping?: Mapping<DbPost>) =>
    postContext(profile, post.id, depth, 'descendents', contextMapping);

export const ancestors = async (profile: ProfileWithMeta | undefined, post: PostWithMeta, depth: number, contextMapping?: Mapping<DbPost>) =>
    postContext(profile, post.id, depth, 'ancestors', contextMapping);

export const replies = async (profile: ProfileWithMeta | undefined, post: PostWithMeta) =>
    descendents(profile, post, 1);

export const baseListPosts = ({ start }: { start?: string }) =>
    addStart<DbPost>(postsMapping, start);

export const baseFeed = ({ start, sort }: { start?: string, sort?: ObjectSort }) =>
    addQuerySort(baseListPosts({ start }).filter('DOC.visibility != "direct"'), sort);

export const baseEventsFeed = () => {
    const mapping = postsMapping
        .sort([['DOC.data.start', 'ASC']])
        .filter({ matches: { type: "event" } });
    return mapping;
}

export const listPosts = async (profile: ProfileWithMeta | undefined, { start, limit = 100, filter }: { start?: string, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(baseListPosts({ start }).filter(filter), { profile, limit });

export const listConversationLeaves = async (profile: ProfileWithMeta) =>
    toFilteredPostsList(profilesMapping.relationsFrom(profile, {
        alias: 'posts',
        edgeCollection: collectionInfos.audienceCollection.name,
        direction: 'INBOUND',
        skipEdge: true,
        cardinality: 'many',
        mapping: conversationLeavesMapping.data(),
    }), { profile, limit: 9999 })


export const listPostsByProfile = async (profile: ProfileWithMeta | undefined, requestedProfile: ProfileWithMeta, { start, limit = 100, filter }: { start?: string, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(profilesMapping.relationsFrom(requestedProfile, {
        alias: 'posts',
        edgeCollection: collectionInfos.entriesCollection.name,
        direction: 'OUTBOUND',
        edgeFilter: 'DOC.type == "create"',
        skipEdge: true,
        cardinality: 'many',
        mapping: baseFeed({ start }).filter(filter).data(),
    }), { profile, limit });

export const listBookmarkedPosts = async (profile: ProfileWithMeta | undefined, requestedProfile: ProfileWithMeta, { start, limit = 100, filter }: { start?: string, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(profilesMapping.relationsFrom(requestedProfile, {
        alias: 'posts',
        edgeCollection: collectionInfos.bookmarksCollection.name,
        direction: 'OUTBOUND',
        skipEdge: true,
        cardinality: 'many',
        mapping: baseFeed({ start }).filter(filter).data(),
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



export const listPostsByType = async (profile: ProfileWithMeta | undefined, type: PostType, { start, limit = 100, filter }: { start?: string, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(baseFeed({ start }).filter(filter).filter({ matches: { type } }), { profile, limit });


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
        mapping: baseFeed({ start }).filter(filter).data(),
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
        mapping: baseFeed({ start }).filter(filter).data(),
    }), { profile, limit });
}

export const listUpcomingEventsFeed = async (profile: ProfileWithMeta | undefined, { offset, limit = 100, filter }: { offset?: number, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(baseEventsFeed()
        .filter(upcomingEventsFilter())
        .filter(filter), { profile, limit, offset });

export const listCurrentEventsFeed = async (profile: ProfileWithMeta | undefined, { offset, limit = 100, filter }: { offset?: number, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(baseEventsFeed()
        .filter(currentEventsFilter())
        .filter(filter), { profile, limit, offset });

export const listPastEventsFeed = async (profile: ProfileWithMeta | undefined, { offset, limit = 100, filter }: { offset?: number, limit?: number, filter?: OMFilter<DbBasePost> } = { limit: 100 }) =>
    toFilteredPostsList(baseEventsFeed()
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


const baseGroupEventsFeed = async (groupId: string, { filter, sort }: { filter?: OMFilter<DbBasePost>, sort?: ObjectSort } = {}) => {
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
        mapping: baseEventsFeed().filter(filter).sort(sort).data(),
    });
}

export const listUpcomingGroupEventsFeed = async (profile: ProfileWithMeta | undefined, groupId: string, { offset, limit = 100 }: { offset?: number, limit?: number } = { limit: 100 }) =>
    toFilteredPostsList(await baseGroupEventsFeed(groupId, { filter: upcomingEventsFilter() }), { profile, limit, offset });

export const listPastGroupEventsFeed = async (profile: ProfileWithMeta | undefined, groupId: string, { offset, limit = 100 }: { offset?: number, limit?: number } = { limit: 100 }) =>
    toFilteredPostsList(await baseGroupEventsFeed(groupId, { filter: pastEventsFilter(), sort: [['DOC.data.start', 'DESC']] }), { profile, limit, offset });


export const listLocalFeed = async (profile: ProfileWithMeta | undefined, { start, limit = 100 }: { start?: string, limit?: number } = { limit: 100 }) =>
    toFilteredPostsList(baseFeed({ start }).filter(localFeedFilter(profile)), { profile, limit });

export const listMyFeed = async (profile: ProfileWithMeta, { start, limit = 100 }: { start?: string, limit?: number } = { limit: 100 }) =>
    toFilteredPostsList(baseFeed({ start }).filter(myFeedFilter(profile)), { profile, limit });

export const reposts = async (post: PostWithMeta) =>
    allpeepDb().then(({ db }) => postsMapping.relationsFrom(post, repostsOfPostRelation).all(db));

export const getConversationByEnd = async (post: PostWithMeta, profile: ProfileWithMeta) =>
    ancestors(profile, post, 9999, sortOldestFirst<DbPost>(postsMapping))
        .then((conversation) => [...conversation, post]);
export const getConversationByStart = async (post: PostWithMeta, profile: ProfileWithMeta) =>
    descendents(profile, post, 9999, sortOldestFirst<DbPost>(postsMapping))
        .then((conversation) => [post, ...conversation]);


export const mentions = async (post: Post, profile: Profile) =>
    allpeepDb().then(({ db }) => mentionsConnectionFinder(db, post, profile));

export const audience = async (post: Post, profile: Profile) =>
    allpeepDb().then(({ db }) => audienceConnectionFinder(db, post, profile));