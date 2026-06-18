import { Download, MoreHorizontal, Share } from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  Event,
  JamRecording,
  PublicPost,
  PublicProfile,
} from '@openpeeps/common/types';
import {
  buildThreads,
  calculateEffectiveRsvps,
  canAccessJamRecordings,
  canManageEventRsvps,
  canModerateJam,
  countYesRsvps,
  groupName,
  isCapacityEvent,
  profileName,
} from '@openpeeps/common/lib';
import { Button, PopupMenu, PopupMenuButton, UpdatingDate } from '@openpeeps/react-ui';
import { useOpenpeeps } from '../../../../contexts/openpeeps';
import { useT } from '../../../../i18n';
import { useCurrentProfile } from '../../../layout/IdentityContext';
import { useToast } from '../../../layout/ToastProvider';
import { usePostViewRef } from '../../../../lib/postViewCounter';
import { useCreateNewConversation } from '../../../conversations';
import {
  Avatar,
  FollowUnfollowButton,
  ProfileCard,
  ProfileFromId,
} from '../../../profile';
import { OpenpeepsMarkdown } from '../../../markdown/OpenpeepsMarkdown';
import { ThreadedFeed } from '../../feed/threaded/ThreadedFeed';
import { ReplyBox } from '../../ReplyBox';
import { EventLocation } from '../../pieces/EventLocation';
import { EventMenu } from '../../pieces/EventMenu';
import { EventRsvpButton } from '../../pieces/EventRsvpButton';
import { ShareMenu } from '../../pieces/ShareMenu';
import { VideoPlayer } from '../../pieces/VideoPlayer';

export interface FullEventProps {
  post: PublicPost;
}

type EventTab =
  | 'description'
  | 'replies'
  | 'rsvps'
  | 'attendees'
  | 'recordings';

export function FullEvent({ post }: FullEventProps) {
  const t = useT();
  const profile = useCurrentProfile();
  const { openCreateConversation } = useCreateNewConversation();
  const postViewRef = usePostViewRef(post.id);
  const { openpeepsApi } = useOpenpeeps();
  const event = post.data as Event;
  const contextQuery = openpeepsApi.usePostContext(post.id);
  const jamAttendeesQuery = openpeepsApi.useJamAttendance(post.id);
  const canViewRecordings = canAccessJamRecordings(profile, post);
  const recordingsQuery = openpeepsApi.usePostRecordings(
    post.id,
    !!event.jam && canViewRecordings,
  );
  const [tab, setTab] = useState<EventTab>(
    event.content ? 'description' : 'replies',
  );

  const group = post.group;
  const myEvent = post.profile?.id === profile?.id;
  const iAmModerator = canModerateJam(profile, post);
  const canManageRsvps = canManageEventRsvps(profile, post);
  const rsvps = useMemo(() => calculateEffectiveRsvps(post), [post]);
  const slotsLeft =
    isCapacityEvent(event) && event.maxAttendees !== undefined
      ? event.maxAttendees - countYesRsvps(post)
      : null;
  const rsvpManage = openpeepsApi.rsvpManageAction();

  const descendentThreads = useMemo(
    () =>
      (contextQuery.data && buildThreads(contextQuery.data.descendants)) || [],
    [contextQuery.data],
  );

  const eventScope = useMemo(() => {
    if (post.visibility === 'public')
      return t('events.public', { defaultValue: 'Public' });
    if (post.groupId && post.visibility === 'group')
      return t('events.group', { defaultValue: 'Group' });
    if (post.visibility === 'direct')
      return t('events.private', { defaultValue: 'Private' });
    return t('events.community', { defaultValue: 'Community' });
  }, [post, t]);

  const showJamAttendeesTab =
    !!event.jam && (myEvent || iAmModerator) && jamAttendeesQuery.isSuccess;

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
          <div className="flex gap-x-4">
            <span className="bg-surface-200 mb-3 inline-block rounded-lg px-3 py-1 text-sm">
              {eventScope}
            </span>
            {slotsLeft !== null ? (
              <span className="bg-surface-200 mb-3 inline-block rounded-lg px-3 py-1 text-sm">
                {slotsLeft <= 0
                  ? t('events.noSpotsAvailable', {
                      defaultValue: 'No spots available',
                    })
                  : t('events.slotsLeft', {
                      defaultValue: '{{count}} slots left',
                      count: slotsLeft,
                    })}
              </span>
            ) : null}
          </div>
          {post.groupId && group ? (
            <a
              href={`/groups/@${group.handle}`}
              className="text-muted-foreground block text-sm hover:underline"
            >
              {groupName(group)}
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <ShareMenu
            post={post}
            menuButton={
              <span className="flex size-10 items-center justify-center rounded-md">
                <Share className="size-4" />
              </span>
            }
          />
          {myEvent ? (
            <EventMenu
              post={post}
              menuButton={
                <span className="border-input flex size-10 items-center justify-center rounded-md border">
                  <MoreHorizontal className="size-4" />
                </span>
              }
            />
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
              {new Date(event.start).toLocaleString(undefined, {
                month: 'short',
              })}
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

      {event.end ? (
        <div className="mt-4 flex gap-x-4">
          <div className="border-foreground/20 rounded-md border px-4 py-1">
            <p className="text-center text-sm">
              {new Date(event.end).toLocaleString(undefined, {
                month: 'short',
              })}
            </p>
            <p className="text-center text-lg font-semibold">
              {new Date(event.end).getDate()}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">
              {t('events.endDate', { defaultValue: 'Ends' })}
            </span>
            <p>
              {new Date(event.end).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {new Date(event.end).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      ) : null}

      <EventLocation post={post} preview={false} />
      <EventRsvpButton post={post} />

      {event.jam && (myEvent || iAmModerator) ? (
        <Button
          variant="variant-filled-primary"
          className="mt-2 w-full"
          action={`/events/${post.id}/jam`}
        >
          {t('events.jam.start', { defaultValue: 'Start jam' })}
        </Button>
      ) : null}

      <nav className="mt-4 flex flex-wrap gap-2 border-b">
        {event.content ? (
          <TabButton
            active={tab === 'description'}
            onClick={() => setTab('description')}
          >
            {t('events.tabs.description', { defaultValue: 'Description' })}
          </TabButton>
        ) : null}
        <TabButton active={tab === 'replies'} onClick={() => setTab('replies')}>
          {t('events.tabs.discussion', { defaultValue: 'Discussion' })}
        </TabButton>
        <TabButton active={tab === 'rsvps'} onClick={() => setTab('rsvps')}>
          {t('events.tabs.rsvps', { defaultValue: 'RSVPs' })}
        </TabButton>
        {showJamAttendeesTab ? (
          <TabButton
            active={tab === 'attendees'}
            onClick={() => setTab('attendees')}
          >
            {t('events.tabs.jamAttendees', { defaultValue: 'Jam attendees' })}
          </TabButton>
        ) : null}
        {event.jam && canViewRecordings ? (
          <TabButton
            active={tab === 'recordings'}
            onClick={() => setTab('recordings')}
          >
            {t('events.tabs.recordings', { defaultValue: 'Recordings' })}
          </TabButton>
        ) : null}
      </nav>

      {tab === 'description' && event.content ? (
        <OpenpeepsMarkdown source={event.content} mentions={post.mentions} />
      ) : null}

      {tab === 'replies' ? (
        <>
          <ReplyBox post={post} />
          {contextQuery.isLoading ? (
            <p className="text-muted-foreground py-4 text-sm">
              {t('common.loading', { defaultValue: 'Loading…' })}
            </p>
          ) : (
            descendentThreads.map((thread) => (
              <ThreadedFeed key={thread.id} thread={thread} isDescendants />
            ))
          )}
        </>
      ) : null}

      {tab === 'rsvps' ? (
        rsvps.length ? (
          rsvps.map((rsvp) => (
            <div key={rsvp.profile.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <ProfileCard
                  profile={rsvp.profile}
                  action={
                    profile && profile.id !== rsvp.profile.id ? (
                      <PopupMenu>
                        {profile.following?.some(
                          (f) => f.id === rsvp.profile.id,
                        ) ? (
                          <PopupMenuButton
                            title={t('profile.actions.message', {
                              defaultValue: 'Message',
                            })}
                            text={t('profile.actions.message', {
                              defaultValue: 'Message',
                            })}
                            action={() =>
                              openCreateConversation({
                                profiles: [rsvp.profile],
                                skipProfileSelection: true,
                              })
                            }
                          />
                        ) : null}
                        <FollowUnfollowButton profile={rsvp.profile} popup />
                      </PopupMenu>
                    ) : undefined
                  }
                />
              </div>
              {canManageRsvps && rsvp.profile.id !== post.profile.id ? (
                rsvp.response === 'removed' ? (
                  <Button
                    variant="variant-ringed-primary"
                    action={() =>
                      rsvpManage(
                        { response: 'yes' },
                        { id: post.id, profileId: rsvp.profile.id },
                      )
                    }
                  >
                    {t('events.rsvp.restoreAttendee', {
                      defaultValue: 'Restore',
                    })}
                  </Button>
                ) : (
                  <Button
                    variant="variant-ringed-error"
                    action={() =>
                      rsvpManage(
                        { response: 'removed' },
                        { id: post.id, profileId: rsvp.profile.id },
                      )
                    }
                  >
                    {t('events.rsvp.removeAttendee', {
                      defaultValue: 'Remove',
                    })}
                  </Button>
                )
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-muted-foreground py-4 text-sm">
            {t('events.noRsvps', { defaultValue: 'No RSVPs yet.' })}
          </p>
        )
      ) : null}

      {tab === 'attendees' && showJamAttendeesTab ? (
        jamAttendeesQuery.data?.length ? (
          jamAttendeesQuery.data.map((attendee) => (
            <ProfileFromId
              key={attendee.id}
              profileId={attendee.profileId}
              action={<UpdatingDate date={attendee.createdAt} />}
            />
          ))
        ) : (
          <p className="text-muted-foreground py-4 text-sm">
            {t('events.noAttendees', { defaultValue: 'No attendees yet.' })}
          </p>
        )
      ) : null}

      {tab === 'recordings' && event.jam && canViewRecordings ? (
        recordingsQuery.isLoading ? (
          <p className="text-muted-foreground py-4 text-sm">
            {t('common.loading', { defaultValue: 'Loading…' })}
          </p>
        ) : recordingsQuery.data?.length ? (
          recordingsQuery.data.map((recording) => (
            <JamRecordingItem
              key={recording.id}
              post={post}
              recording={recording}
              canPublish={canViewRecordings}
            />
          ))
        ) : (
          <p className="text-muted-foreground py-4 text-sm">
            {t('events.noRecordings', { defaultValue: 'No recordings yet.' })}
          </p>
        )
      ) : null}

      <div className="h-[40vh]" />
    </div>
  );
}

function JamRecordingItem({
  post,
  recording,
  canPublish,
}: {
  post: PublicPost;
  recording: JamRecording;
  canPublish: boolean;
}) {
  const t = useT();
  const { success, error: toastError } = useToast();
  const { openpeepsApi } = useOpenpeeps();
  const publishReply = openpeepsApi.publishRecordingReplyAction({
    id: post.id,
    recordingId: recording.id,
  });

  return (
    <div className="flex flex-col gap-2 py-4">
      <UpdatingDate date={recording.createdAt} />
      {recording.status === 'completed' && recording.attachment ? (
        <>
          <VideoPlayer
            attachment={recording.attachment}
            autoPlay={false}
            muted={false}
            className="aspect-video w-full rounded-md"
          />
          <a
            href={recording.attachment.url}
            download={recording.attachment.filename}
            className="text-primary inline-flex items-center gap-1 self-start text-sm hover:underline"
          >
            <Download className="h-4 w-4" />
            {t('events.downloadRecording', {
              defaultValue: 'Download recording',
            })}
          </a>
        </>
      ) : (
        <p className="text-muted-foreground text-sm">
          {recording.status === 'active'
            ? t('events.recordingInProgress', {
                defaultValue: 'Recording in progress…',
              })
            : t('events.recordingProcessing', {
                defaultValue: 'Processing recording…',
              })}
        </p>
      )}
      {canPublish &&
      recording.status === 'completed' &&
      recording.attachment ? (
        recording.replyPostId ? (
          <p className="text-muted-foreground text-sm">
            {t('events.recordingReplyPosted', {
              defaultValue: 'Posted to discussion',
            })}
          </p>
        ) : (
          <Button
            variant="variant-ringed-primary"
            className="self-start"
            action={async () => {
              try {
                await publishReply();
                success(
                  t('events.postRecordingReplySuccess', {
                    defaultValue: 'Recording posted to discussion',
                  }),
                );
              } catch {
                toastError(
                  t('events.postRecordingReplyError', {
                    defaultValue: 'Failed to post recording to discussion',
                  }),
                );
              }
            }}
          >
            {t('events.postRecordingReply', {
              defaultValue: 'Post to discussion',
            })}
          </Button>
        )
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm ${active ? 'border-primary border-b-2 font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}
