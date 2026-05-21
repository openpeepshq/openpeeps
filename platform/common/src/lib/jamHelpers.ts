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

export const canModerateJam = (profile: PublicProfile | undefined, post: PublicPost) =>
    !!(
        profile &&
        jamFromEvent(post)?.moderators?.includes(profile.id)
    )