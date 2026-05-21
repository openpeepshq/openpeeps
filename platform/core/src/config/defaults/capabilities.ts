import { CapabilitiesConfigInput, postCapabilities } from "@openpeeps/common/types";

export const defaultCapabilitiesConfig: CapabilitiesConfigInput = {
    post: {
        local: {
            add: [
                'core-posts-read',
                'core-posts-vote',
                'core-posts-react',
                'core-posts-rsvp',
                'core-posts-reply',
            ]
        },
        audience: { add: ['core-posts-read', 'core-posts-vote', 'core-posts-react', 'core-posts-rsvp', 'core-posts-reply'] },
        collaborator: { add: ['core-posts-update'] },
        jamModerator: { add: ['core-posts-jam-moderate'] },
    },
    profile: {
        none: {
            add: [
                'core-profiles-read',
                'core-profiles-follow',
                'core-profiles-unfollow',
                'core-profiles-block',
                'core-profiles-unblock',
                'core-profiles-mute',
                'core-profiles-unmute',
            ]
        },
        self: { add: ['core-profiles-update', ...postCapabilities] },
        blocked: { remove: ['*'] },
        blockedBy: { remove: ['*'] },
    },
    report: {
        reporter: { add: ['core-reports-read'] },
    },
    accessToken: {
        owner: { add: ['core-serviceTokens-delete'] },
    },
};