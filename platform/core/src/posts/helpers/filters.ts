import { OMFilter } from "@openpeeps/arango-querybuilder";
import { PostWithMeta, ProfileWithMeta, CapabilitiesConfig, postWithMetaSchema, GroupWithMeta, DbBasePost } from "@openpeeps/common/types";
import { yesOrMaybeRsvpExpression } from "./aql";
import { checkCapabilities, checkPostCapabilities, mergeCapabilities } from "@openpeeps/common/lib";


export const ownPostsFilter = (profile: ProfileWithMeta): OMFilter<DbBasePost> => ({
    matches: {
        creatorId: profile.id
    }
});

const isPrivateGroup = (group: GroupWithMeta) =>
    !checkCapabilities(
        ['core-groups-read'],
        mergeCapabilities(
            [
                group.capabilities.none,
                group.capabilities.local
            ]
        )).success;

const myPrivateGroupsFilter = (profile: ProfileWithMeta): OMFilter<DbBasePost> => (

    {
        matches: profile.memberships.filter((m) => isPrivateGroup(m.group as GroupWithMeta)).map((m) => ({
            visibility: 'group',
            group: {
                id: m.group.id as string,
            }
        }))
    }
);

const myPublicGroupsFilter = (profile: ProfileWithMeta): OMFilter<DbBasePost> => (
    {
        matches: profile.memberships.filter((m) => !isPrivateGroup(m.group as GroupWithMeta)).map((m) => ({
            visibility: 'group',
            group: {
                id: m.group.id as string,
            }
        }))
    }
);

export const followFilter = (profile: ProfileWithMeta): OMFilter<DbBasePost> => ({
    matches: profile.following.map((f) => ({
        creatorId: f.id
    }))
});

const myGroupsFilter = (profile: ProfileWithMeta): OMFilter<DbBasePost> => ({
    operator: '||',
    predicates: profile.memberships.map((m) => ({
        matches: {
            visibility: 'group',
            group: {
                id: m.group.id as string
            }
        }
    }))
});


export const myFeedFilter = (profile: ProfileWithMeta): OMFilter<DbBasePost> => {
    let predicates = [
        ownPostsFilter(profile),
    ];

    if (profile.memberships.length > 0) {
        predicates.push(myGroupsFilter(profile));
    }

    if (profile.following.length > 0) {
        predicates.push(followFilter(profile));
    }

    return {
        operator: '||',
        predicates
    }
}

export const localFeedFilter = (profile?: ProfileWithMeta): OMFilter<DbBasePost> => profile ? ({
    operator: '||',
    predicates: [
        { matches: [{ visibility: 'local' }, { visibility: 'public' }, { visibility: 'local' }] },
        profile && myPublicGroupsFilter(profile)
    ]
}) : { matches: [{ visibility: 'local' }, { visibility: 'public' }, { visibility: 'local' }] };

export const canReadPost = (config: CapabilitiesConfig, profile?: ProfileWithMeta) => (post?: PostWithMeta) =>
    !!post &&
    checkPostCapabilities(['core-posts-read'], profile, post, config).success
    && postWithMetaSchema.safeParse(post).success


export const upcomingEventsFilter = () => {
    const now = new Date().toISOString();
    return `((DOC.data.start > '${now}') || (DOC.data.end && DOC.data.end > '${now}'))`
}

export const currentEventsFilter = () => {
    const now = new Date().toISOString();
    return `DOC.data.start <= '${now}' && (!DOC.data.end || DOC.data.end >= '${now}')`
}

export const pastEventsFilter = () => {
    const now = new Date().toISOString();
    return `(DOC.data.end || DOC.data.start) < '${now}'`
}

export const myEventsFilter = (profile: ProfileWithMeta): OMFilter<DbBasePost> => ({
    operator: '||',
    predicates: [
        {
            matches: {
                creatorId: profile.id
            }
        },
        `"${profile.id}" IN DOC.data.jam.moderators || []`,
        yesOrMaybeRsvpExpression(profile)
    ]
})

export const jamFilter = 'DOC.data.jam != null';