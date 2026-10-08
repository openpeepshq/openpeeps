import type { Event, PublicPost } from '@openpeepshq/common/types';
import { buildEventIcs } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../../components/layout/IdentityContext';

export type EventIcsFile = { filename: string; content: string };

/** Share actions for a post; `postUrl` is the platform's canonical public link. */
export const useShareMenu = (post: PublicPost, postUrl: string) => {
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const repostPost = openpeepsApi.repostPostAction({ id: post.id });

  const eventIcsFile = (): EventIcsFile | null => {
    const ics = buildEventIcs(post, { postUrl });
    if (!ics) return null;
    const event = post.data as Event;
    const raw = event.name?.trim() || `event-${post.id}`;
    const safe = raw.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 100);
    return { filename: `${safe}.ics`, content: ics };
  };

  return {
    signedIn: !!me,
    isEvent: post.type === 'event',
    repost: () => repostPost(undefined),
    eventIcsFile,
  };
};
