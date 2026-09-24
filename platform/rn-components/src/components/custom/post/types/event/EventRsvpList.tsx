import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PublicPost, PublicRsvp } from '@openpeepshq/common/types';
import type { ExpandedOccurrence } from '@openpeepshq/common/lib';
import {
  calculateEffectiveRsvps,
  countYesRsvps,
  isCapacityEvent,
  isRecurringEvent,
  listedRsvps,
  listRsvpCancellations,
  profileName,
  rsvpCancelWhenLabels,
  sameRecurrenceId,
} from '@openpeepshq/common/lib';
import { ChevronDownIcon, ChevronRightIcon } from '~/components/icons';
import { ThemedText } from '~/components/ui/themed-text';
import { Button } from '~/components/ui/button';
import { ProfileCard } from '~/components/custom/profile/profile-card';

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
  t: (key: string, options?: Record<string, string | number>) => string
) => {
  const event = post.data?.type === 'event' ? post.data : undefined;
  if (event && isCapacityEvent(event) && event.maxAttendees !== undefined) {
    return t('events.occurrence.capacity', {
      filled: countYesRsvps(post, recurrenceId),
      max: event.maxAttendees,
    });
  }
  const count = calculateEffectiveRsvps(post, recurrenceId).filter(
    (rsvp) => rsvp.response === 'yes' || rsvp.response === 'tentative'
  ).length;
  return t('events.occurrence.rsvpCount', { count });
};

export interface EventRsvpListProps {
  post: PublicPost;
  occurrenceId?: string;
  occurrences: ExpandedOccurrence[];
  canManageRsvps: boolean;
  onManage: (
    response: 'yes' | 'removed',
    profileId: string,
    recurrenceId?: string
  ) => void;
}

export const EventRsvpList: React.FC<EventRsvpListProps> = ({
  post,
  occurrenceId,
  occurrences,
  canManageRsvps,
  onManage,
}) => {
  const { t } = useTranslation();
  const event = post.data?.type === 'event' ? post.data : undefined;
  const recurring = event ? isRecurringEvent(event) : false;
  const activeKey = occurrenceId ?? seriesKey;
  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(
    () => new Set([activeKey])
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
      <View>
        <RsvpGroup
          rsvps={listedRsvps(calculateEffectiveRsvps(post, occurrenceId))}
          post={post}
          canManageRsvps={canManageRsvps}
          recurrenceId={occurrenceId}
          onManage={onManage}
        />
        {history}
      </View>
    );
  }

  return (
    <View>
      <RsvpPanel
        title={`${t('events.occurrence.viewSeries')} ${panelCountLabel(post, undefined, t)}`}
        open={openKeys.has(seriesKey)}
        onToggle={() => toggle(seriesKey)}
      >
        <RsvpGroup
          rsvps={listedRsvps(calculateEffectiveRsvps(post))}
          post={post}
          canManageRsvps={canManageRsvps}
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
              canManageRsvps={canManageRsvps}
              recurrenceId={key}
              onManage={onManage}
            />
          </RsvpPanel>
        );
      })}
      {history}
    </View>
  );
};

const RsvpCancellationHistory: React.FC<{ post: PublicPost }> = ({ post }) => {
  const { t } = useTranslation();
  const cancellations = listRsvpCancellations(post);
  if (!cancellations.length) return null;
  return (
    <View className="mt-4 border-t border-border pt-3">
      <ThemedText className="mb-2 text-sm font-semibold">
        {t('events.rsvp.historyTitle')}
      </ThemedText>
      {cancellations.map((record) => {
        const when = rsvpCancelWhenLabels(post, {
          occurrenceIds: record.recurrenceId ? [record.recurrenceId] : [],
          series: record.series,
        });
        const whenLabel = when.series
          ? t('events.rsvp.canceledSeries')
          : when.labels.join(', ');
        return (
          <ThemedText
            key={`${record.profile.id}-${record.canceledAt}-${record.recurrenceId ?? 'event'}`}
            className="text-sm"
          >
            {profileName(record.profile)} {t('events.rsvp.canceled')}
            {whenLabel ? ` — ${whenLabel}` : ''}{' '}
            {new Date(record.canceledAt).toLocaleString()}
          </ThemedText>
        );
      })}
    </View>
  );
};

const RsvpPanel: React.FC<{
  title: string;
  open: boolean;
  onToggle: () => void;
  current?: boolean;
  children: React.ReactNode;
}> = ({ title, open, onToggle, current, children }) => (
  <View>
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={onToggle}
      className={`flex-row items-center gap-x-2 px-2 py-2 ${
        current ? 'bg-muted rounded' : ''
      }`}
    >
      {open ? (
        <ChevronDownIcon className="text-foreground" size={16} />
      ) : (
        <ChevronRightIcon className="text-foreground" size={16} />
      )}
      <ThemedText
        className={`text-sm flex-1 ${current ? 'font-semibold' : ''}`}
      >
        {title}
      </ThemedText>
    </Pressable>
    {open ? <View className="pl-4">{children}</View> : null}
  </View>
);

const RsvpGroup: React.FC<{
  rsvps: PublicRsvp[];
  post: PublicPost;
  canManageRsvps: boolean;
  recurrenceId?: string;
  onManage: (
    response: 'yes' | 'removed',
    profileId: string,
    recurrenceId?: string
  ) => void;
}> = ({ rsvps, post, canManageRsvps, recurrenceId, onManage }) => {
  const { t } = useTranslation();
  if (!rsvps.length) {
    return (
      <ThemedText className="text-muted-foreground py-2 text-sm">
        {t('events.noRsvps')}
      </ThemedText>
    );
  }
  return (
    <>
      {rsvps.map((rsvp) => (
        <ProfileCard
          key={rsvp.profile.id}
          profile={rsvp.profile}
          rightComponent={
            <View className="flex flex-row items-center justify-center gap-x-2">
              <ThemedText className="text-muted-foreground">
                {rsvp.response}
              </ThemedText>
              {canManageRsvps && rsvp.profile.id !== post.profile.id ? (
                rsvp.response === 'removed' ? (
                  <Button
                    variant="outline"
                    onPress={() =>
                      onManage('yes', rsvp.profile.id, recurrenceId)
                    }
                  >
                    <ThemedText>{t('events.rsvp.restoreAttendee')}</ThemedText>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onPress={() =>
                      onManage('removed', rsvp.profile.id, recurrenceId)
                    }
                  >
                    <ThemedText className="text-destructive">
                      {t('events.rsvp.removeAttendee')}
                    </ThemedText>
                  </Button>
                )
              ) : null}
            </View>
          }
        />
      ))}
    </>
  );
};
