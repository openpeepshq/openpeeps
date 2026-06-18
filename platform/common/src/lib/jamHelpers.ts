import { Jam, PublicPost, PublicProfile } from "../types";


export const getJamUrl = (id: string, origin: string | undefined) => {
    if (!id) {
        return '';
    }
    if (!origin) return `/events/${id}/jam`;
    return `${origin}/events/${id}/jam`;
};

export const jamFromEvent = (event: PublicPost): Jam | undefined => {
    if (event.data?.type === 'event' && event.data?.jam) {
        return event.data.jam;
    }
    return undefined;
};

export const canModerateJam = (
    profile: Pick<PublicProfile, 'id'> | undefined,
    post: PublicPost,
) =>
    !!(
        profile &&
        jamFromEvent(post)?.moderators?.includes(profile.id)
    );

export const canAccessJamRecordings = (
    profile: PublicProfile | undefined,
    post: PublicPost,
) => {
    if (!profile) {
        return false;
    }
    if (post.profile.id === profile.id) {
        return true;
    }
    if (post.data?.type !== 'event') {
        return false;
    }
    const event = post.data;
    if (event.moderators?.includes(profile.id)) {
        return true;
    }
    return !!event.jam?.moderators?.includes(profile.id);
};
