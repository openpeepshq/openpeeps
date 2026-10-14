import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type {
  PublicPost,
  PublicProfile,
  PublicRsvp,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import type { ExpandedOccurrence } from '@openpeepshq/common/lib';
import {
  calculateEffectiveRsvps,
  countYesRsvps,
  isCapacityEvent,
  isRecurringEvent,
  listedRsvps,
  listRsvpCancellations,
  offerStillOpen,
  orderedWaitlist,
  profileName,
  rsvpCancelWhenLabels,
  sameRecurrenceId,
} from '@openpeepshq/common/lib';
import {
  Button,
  PopupMenu,
  PopupMenuButton,
  UpdatingDate,
} from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import { FollowUnfollowButton, ProfileCard } from '../../profile';

const seriesKey = 'series';

const formatOccurrenceStart = (start: string) =>
  new Date(start).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const panelCountLabel = (
  post: PublicPost,
  recurrenceId: string | undefined,
  t: (key: string, options?: Record<string, string | number>) => string,
) => {
  const event = post.data?.type === 'event' ? post.data : undefined;
  if (event && isCapacityEvent(event) && event.maxAttendees !== undefined) {
    return t('events.occurrence.capacity', {
      defaultValue: '({{filled}}/{{max}})',
      filled: countYesRsvps(post, recurrenceId),
      max: event.maxAttendees,
    });
  }
  const count = calculateEffectiveRsvps(post, recurrenceId).filter(
    (rsvp) => rsvp.response === 'yes' || rsvp.response === 'tentative',
  ).length;
  return t('events.occurrence.rsvpCount', {
    defaultValue: '({{count}})',
    count,
  });
};

export type EventRsvpListProps = {
  post: PublicPost;
  occurrenceId?: string;
  occurrences: ExpandedOccurrence[];
  currentProfile?: ProfileWithMeta;
  canManageRsvps: boolean;
  onMessage: (profile: PublicProfile) => void;
  onManage: (
    response: 'yes' | 'removed',
    profileId: string,
    recurrenceId?: string,
  ) => void;
};

export const EventRsvpList = ({
  post,
  occurrenceId,
  occurrences,
  currentProfile,
  canManageRsvps,
  onMessage,
  onManage,
}: EventRsvpListProps) => {
  const t = useT();
  const event = post.data?.type === 'event' ? post.data : undefined;
  const recurring = event ? isRecurringEvent(event) : false;
  const activeKey = occurrenceId ?? seriesKey;
  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(
    () => new Set([activeKey]),
  );

  useEffect(() => {
    setOpenKeys((prev) => {
      if (prev.has(activeKey)) return prev;
      const next = new Set(prev);
      next.add(activeKey);
      return next;
    });
  }, [activeKey]);

  const toggle = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const history = canManageRsvps ? (
    <RsvpCancellationHistory post={post} />
  ) : null;

  if (!recurring) {
    return (
      <>
        <RsvpGroup
          rsvps={listedRsvps(calculateEffectiveRsvps(post, occurrenceId))}
          post={post}
          currentProfile={currentProfile}
          canManageRsvps={canManageRsvps}
          recurrenceId={occurrenceId}
          onMessage={onMessage}
          onManage={onManage}
        />
        {canManageRsvps ? (
          <WaitlistSection post={post} recurrenceId={occurrenceId} />
        ) : null}
        {history}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1 py-2">
      <RsvpPanel
        title={`${t('events.occurrence.viewSeries', {
          defaultValue: 'All dates',
        })} ${panelCountLabel(post, undefined, t)}`}
        open={openKeys.has(seriesKey)}
        onToggle={() => toggle(seriesKey)}
      >
        <RsvpGroup
          rsvps={listedRsvps(calculateEffectiveRsvps(post))}
          post={post}
          currentProfile={currentProfile}
          canManageRsvps={canManageRsvps}
          onMessage={onMessage}
          onManage={onManage}
        />
      </RsvpPanel>
      {occurrences.map((occurrence) => {
        const key = occurrence.recurrenceId;
        return (
          <RsvpPanel
            key={key}
            title={`${formatOccurrenceStart(occurrence.start)} ${panelCountLabel(post, key, t)}`}
            open={openKeys.has(key)}
            onToggle={() => toggle(key)}
            current={sameRecurrenceId(key, occurrenceId)}
          >
            <RsvpGroup
              rsvps={listedRsvps(calculateEffectiveRsvps(post, key))}
              post={post}
              currentProfile={currentProfile}
              canManageRsvps={canManageRsvps}
              recurrenceId={key}
              onMessage={onMessage}
              onManage={onManage}
            />
            {canManageRsvps ? (
              <WaitlistSection post={post} recurrenceId={key} />
            ) : null}
          </RsvpPanel>
        );
      })}
      {history}
    </div>
  );
};

const WaitlistSection = ({
  post,
  recurrenceId,
}: {
  post: PublicPost;
  recurrenceId?: string;
}) => {
  const t = useT();
  const waiting = orderedWaitlist(post, recurrenceId);
  if (!waiting.length) return null;
  const profiles = new Map(
    (post.rsvps ?? []).map((rsvp) => [rsvp.profile.id, rsvp.profile]),
  );
  return (
    <div className="mt-4 border-t pt-3">
      <h3 className="mb-2 text-sm font-semibold">
        {t('events.rsvp.waitlistTitle', { defaultValue: 'Waitlist' })}
      </h3>
      <ol className="flex flex-col gap-2">
        {waiting.map((member, index) => {
          const profile = profiles.get(member.profileId);
          if (!profile) return null;
          const until = member.offerExpiresAt;
          const offered = !!until && offerStillOpen({ offerExpiresAt: until });
          return (
            <li key={member.profileId} className="text-sm">
              <span className="text-muted-foreground">{index + 1}. </span>
              <span className="font-medium">{profileName(profile)}</span>
              {offered ? (
                <span className="text-muted-foreground">
                  {' '}
                  —{' '}
                  {t('events.rsvp.waitlistOffered', {
                    defaultValue: 'offered until {{until}}',
                    until: new Date(until ?? '').toLocaleString(),
                  })}
                </span>
              ) : null}
              {profile.type === 'federated' ? (
                <span className="text-muted-foreground">
                  {' '}
                  —{' '}
                  {t('events.rsvp.waitlistRemote', {
                    defaultValue:
                      'Remote member, not offered a spot automatically',
                  })}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const RsvpCancellationHistory = ({ post }: { post: PublicPost }) => {
  const t = useT();
  const cancellations = listRsvpCancellations(post);
  if (!cancellations.length) return null;
  return (
    <div className="mt-4 border-t pt-3">
      <h3 className="mb-2 text-sm font-semibold">
        {t('events.rsvp.historyTitle', { defaultValue: 'RSVP history' })}
      </h3>
      <ul className="flex flex-col gap-2">
        {cancellations.map((record) => {
          const when = rsvpCancelWhenLabels(post, {
            occurrenceIds: record.recurrenceId ? [record.recurrenceId] : [],
            series: record.series,
          });
          const whenLabel = when.series
            ? t('events.rsvp.canceledSeries', {
                defaultValue: 'All dates in the series',
              })
            : when.labels.join(', ');
          return (
            <li
              key={`${record.profile.id}-${record.canceledAt}-${record.recurrenceId ?? 'event'}`}
              className="text-sm"
            >
              <span className="font-medium">{profileName(record.profile)}</span>{' '}
              {t('events.rsvp.canceled', {
                defaultValue: 'canceled their RSVP',
              })}
              {whenLabel ? (
                <span className="text-muted-foreground"> — {whenLabel}</span>
              ) : null}{' '}
              <span className="text-muted-foreground">
                <UpdatingDate date={record.canceledAt} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const RsvpPanel = ({
  title,
  open,
  onToggle,
  current,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  current?: boolean;
  children: ReactNode;
}) => (
  <div>
    <button
      type="button"
      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
        current ? 'bg-muted font-medium' : 'hover:bg-muted'
      }`}
      aria-expanded={open}
      onClick={onToggle}
    >
      {open ? (
        <ChevronDown className="size-4 shrink-0" />
      ) : (
        <ChevronRight className="size-4 shrink-0" />
      )}
      <span>{title}</span>
    </button>
    {open ? <div className="pl-6">{children}</div> : null}
  </div>
);

const RsvpGroup = ({
  rsvps,
  post,
  currentProfile,
  canManageRsvps,
  recurrenceId,
  onMessage,
  onManage,
}: {
  rsvps: PublicRsvp[];
  post: PublicPost;
  currentProfile?: ProfileWithMeta;
  canManageRsvps: boolean;
  recurrenceId?: string;
  onMessage: (profile: PublicProfile) => void;
  onManage: (
    response: 'yes' | 'removed',
    profileId: string,
    recurrenceId?: string,
  ) => void;
}) => {
  const t = useT();
  if (!rsvps.length) {
    return (
      <p className="text-muted-foreground py-2 text-sm">
        {t('events.noRsvps', { defaultValue: 'No RSVPs yet.' })}
      </p>
    );
  }
  return (
    <>
      {rsvps.map((rsvp) => (
        <EventRsvpRow
          key={rsvp.profile.id}
          rsvp={rsvp}
          post={post}
          currentProfile={currentProfile}
          canManageRsvps={canManageRsvps}
          recurrenceId={recurrenceId}
          onMessage={onMessage}
          onManage={onManage}
        />
      ))}
    </>
  );
};

const EventRsvpRow = ({
  rsvp,
  post,
  currentProfile,
  canManageRsvps,
  recurrenceId,
  onMessage,
  onManage,
}: {
  rsvp: PublicRsvp;
  post: PublicPost;
  currentProfile?: ProfileWithMeta;
  canManageRsvps: boolean;
  recurrenceId?: string;
  onMessage: (profile: PublicProfile) => void;
  onManage: (
    response: 'yes' | 'removed',
    profileId: string,
    recurrenceId?: string,
  ) => void;
}) => {
  const t = useT();
  const following = currentProfile?.following?.some(
    (f) => f.id === rsvp.profile.id,
  );
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <ProfileCard
          profile={rsvp.profile}
          action={
            currentProfile && currentProfile.id !== rsvp.profile.id ? (
              <PopupMenu>
                {following ? (
                  <PopupMenuButton
                    title={t('profile.actions.message', {
                      defaultValue: 'Message',
                    })}
                    text={t('profile.actions.message', {
                      defaultValue: 'Message',
                    })}
                    action={() => onMessage(rsvp.profile)}
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
            variant="outline"
            action={() => onManage('yes', rsvp.profile.id, recurrenceId)}
          >
            {t('events.rsvp.restoreAttendee', {
              defaultValue: 'Restore',
            })}
          </Button>
        ) : (
          <Button
            variant="outline"
            action={() => onManage('removed', rsvp.profile.id, recurrenceId)}
          >
            {t('events.rsvp.removeAttendee', {
              defaultValue: 'Remove',
            })}
          </Button>
        )
      ) : null}
    </div>
  );
};
