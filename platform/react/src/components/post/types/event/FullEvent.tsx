import { useMemo, useState } from 'react';
import type { Event, PublicPost, PublicProfile } from '@openpeeps/common/types';
import {
  buildThreads,
  calculateEffectiveRsvps,
  groupName,
  profileName,
} from '@openpeeps/common/lib';
import { useOpenpeeps } from '../../../../contexts/openpeeps';
import { useT } from '../../../../i18n';
import { useCurrentProfile } from '../../../layout/IdentityContext';
import { usePostViewRef } from '../../../../lib/postViewCounter';
import { Avatar } from '../../../profile';
import { PostMarkdown } from '../../Markdown';
import { ThreadedFeed } from '../../feed/threaded/ThreadedFeed';
import { ReplyBox } from '../../ReplyBox';
import { EventLocation } from '../../pieces/EventLocation';
import { EventRsvpButton } from '../../pieces/EventRsvpButton';
import { Button } from '@openpeeps/react-ui';

export interface FullEventProps {
  post: PublicPost;
}

export function FullEvent({ post }: FullEventProps) {
  const t = useT();
  const profile = useCurrentProfile();
  const postViewRef = usePostViewRef(post.id);
  const { openpeepsApi } = useOpenpeeps();
  const contextQuery = openpeepsApi.usePostContext(post.id);
  const [tab, setTab] = useState<'description' | 'replies'>(
    post.data?.type === 'event' && (post.data as Event).content
      ? 'description'
      : 'replies',
  );

  const event = post.data as Event;
  const group = post.group;
  const myEvent = post.profile?.id === profile?.id;
  const rsvps = useMemo(() => calculateEffectiveRsvps(post), [post]);

  const descendentThreads = useMemo(
    () =>
      (contextQuery.data && buildThreads(contextQuery.data.descendants)) || [],
    [contextQuery.data],
  );

  const eventScope = useMemo(() => {
    if (post.visibility === 'public') return t('events.public', { defaultValue: 'Public' });
    if (post.groupId && post.visibility === 'group')
      return t('events.group', { defaultValue: 'Group' });
    if (post.visibility === 'direct')
      return t('events.private', { defaultValue: 'Private' });
    return t('events.community', { defaultValue: 'Community' });
  }, [post, t]);

  return (
    <div ref={postViewRef} className="flex w-full flex-col gap-2 p-3">
      <span className="mb-3 block aspect-video w-full overflow-hidden rounded">
        <img
          src={event.image || '/img/event-default.png'}
          className="h-full w-full object-cover"
          alt={event.name ? `image for ${event.name}` : 'Event'}
        />
      </span>

      <div className="flex items-center justify-between">
        <div>
          <span className="bg-surface-200 mb-3 inline-block rounded-lg px-3 py-1 text-sm">
            {eventScope}
          </span>
          {post.groupId && group ? (
            <a
              href={`/groups/@${group.handle}`}
              className="text-muted-foreground block text-sm hover:underline"
            >
              {groupName(group)}
            </a>
          ) : null}
        </div>
      </div>

      <h1 className="text-2xl font-bold">{event.name}</h1>

      <div className="mt-2 flex items-center gap-x-2">
        <Avatar profile={post.profile as PublicProfile} size={2} />
        <span className="text-sm">
          {t('events.hostedBy', {
            defaultValue: 'Hosted by {{profileName}}',
            profileName: `${profileName(post.profile)}${myEvent ? ' · You' : ''}`,
          })}
        </span>
      </div>

      {event.start ? (
        <div className="mt-4 flex gap-x-4">
          <div className="border-foreground/20 rounded-md border px-4 py-1">
            <p className="text-center text-sm">
              {new Date(event.start).toLocaleString(undefined, { month: 'short' })}
            </p>
            <p className="text-center text-lg font-semibold">
              {new Date(event.start).getDate()}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">
              {t('events.startDate', { defaultValue: 'Starts' })}
            </span>
            <p>
              {new Date(event.start).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {new Date(event.start).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ) : null}

      <EventLocation post={post} preview={false} />

      <EventRsvpButton post={post} />

      {event.jam ? (
        <Button
          variant="variant-filled-primary"
          className="mt-2"
          action={`/events/${post.id}/jam`}
        >
          {t('events.joinJam', { defaultValue: 'Join jam' })}
        </Button>
      ) : null}

      <div className="mt-4 flex gap-2 border-b">
        {event.content ? (
          <button
            type="button"
            className={`px-4 py-2 text-sm ${tab === 'description' ? 'border-b-2 border-primary font-semibold' : ''}`}
            onClick={() => setTab('description')}
          >
            {t('events.description', { defaultValue: 'Description' })}
          </button>
        ) : null}
        <button
          type="button"
          className={`px-4 py-2 text-sm ${tab === 'replies' ? 'border-b-2 border-primary font-semibold' : ''}`}
          onClick={() => setTab('replies')}
        >
          {t('events.replies', { defaultValue: 'Replies' })}
        </button>
      </div>

      {tab === 'description' && event.content ? (
        <PostMarkdown source={event.content} />
      ) : null}

      {tab === 'replies' ? (
        <>
          <ReplyBox post={post} />
          {descendentThreads.map((thread) => (
            <ThreadedFeed key={thread.id} thread={thread} isDescendants />
          ))}
        </>
      ) : null}

      {rsvps.length > 0 ? (
        <div className="mt-4">
          <h2 className="mb-2 font-semibold">
            {t('events.attendees', { defaultValue: 'Attendees' })} ({rsvps.length})
          </h2>
          <ul className="space-y-1 text-sm">
            {rsvps.slice(0, 20).map((rsvp) => (
              <li key={rsvp.profile.id}>
                {profileName(rsvp.profile)} — {rsvp.response}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="h-[40vh]" />
    </div>
  );
}
