import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { PublicPost } from '@openpeepshq/common';
import {
  calendarDayNumber,
  calendarEventName,
  eventEndIso,
  eventStartIso,
  useEventsCalendar,
  type EventsAgendaWindow,
  type EventsCalendarQuery,
} from '@openpeepshq/react';
import { ChevronLeftIcon, ChevronRightIcon } from '~/components/icons';
import { MainStackParamList } from '~/components/navigation/types';
import { ThemedText } from '~/components/ui/themed-text';
import { cn } from '~/lib/utils';

export interface EventsCalendarProps {
  query: EventsCalendarQuery;
  agenda: EventsAgendaWindow;
}

const postKey = (post: PublicPost) =>
  `${post.id}:${post.occurrenceRecurrenceId ?? ''}`;

export const EventsCalendar = ({ query, agenda }: EventsCalendarProps) => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const {
    cells,
    byDay,
    todayKey,
    selected,
    selectedEvents,
    selectedLabel,
    setSelectedKey,
    monthLabel,
    weekdayLabels,
    isLoading,
    isFetchingNextPage,
    shiftMonth,
    goToday,
  } = useEventsCalendar(query, agenda);

  const openEvent = (post: PublicPost) =>
    navigation.navigate('Post', {
      id: post.id,
      occurrence: post.occurrenceRecurrenceId ?? undefined,
    });

  if (isLoading) {
    return (
      <View className="h-32 items-center justify-center">
        <ActivityIndicator size="small" />
      </View>
    );
  }

  return (
    <View className="px-4">
      <View className="mb-3 flex-row items-center justify-between gap-x-2">
        <ThemedText className="text-lg font-semibold">{monthLabel}</ThemedText>
        <View className="flex-row items-center gap-x-1">
          {isFetchingNextPage ? <ActivityIndicator size="small" /> : null}
          <Pressable className="px-2 py-1" onPress={goToday}>
            <ThemedText className="text-muted-foreground text-sm">
              {t('events.calendar.today', { defaultValue: 'Today' })}
            </ThemedText>
          </Pressable>
          <Pressable
            className="rounded-md p-1"
            accessibilityLabel={t('events.calendar.previousMonth', {
              defaultValue: 'Previous month',
            })}
            onPress={() => shiftMonth(-1)}
          >
            <ChevronLeftIcon size={20} className="text-foreground" />
          </Pressable>
          <Pressable
            className="rounded-md p-1"
            accessibilityLabel={t('events.calendar.nextMonth', {
              defaultValue: 'Next month',
            })}
            onPress={() => shiftMonth(1)}
          >
            <ChevronRightIcon size={20} className="text-foreground" />
          </Pressable>
        </View>
      </View>

      <View className="border border-border rounded-md overflow-hidden">
        <View className="flex-row bg-muted">
          {weekdayLabels.map((label, index) => (
            <View key={`${label}-${index}`} className="flex-1 px-1 py-2">
              <ThemedText className="text-muted-foreground text-center text-xs">
                {label}
              </ThemedText>
            </View>
          ))}
        </View>
        <View className="flex-row flex-wrap bg-border">
          {cells.map((cell) => {
            const dayEvents = byDay.get(cell.key) ?? [];
            const hidden = Math.max(0, dayEvents.length - 2);
            const isSelected = cell.key === selected;
            const isToday = cell.key === todayKey;
            return (
              <Pressable
                key={cell.key}
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedKey(cell.key)}
                style={{ width: `${100 / 7}%` }}
                className={cn(
                  'bg-background min-h-14 p-1 border-[0.5px] border-border items-center',
                  isSelected && 'bg-primary/10',
                  !cell.inMonth && 'opacity-60'
                )}
              >
                <View
                  className={cn(
                    'size-6 items-center justify-center rounded-full',
                    isToday && 'bg-primary'
                  )}
                >
                  <ThemedText
                    className={cn(
                      'text-xs',
                      isToday && 'text-primary-foreground',
                      !cell.inMonth && 'text-muted-foreground'
                    )}
                  >
                    {calendarDayNumber(cell.key)}
                  </ThemedText>
                </View>
                {dayEvents.length > 0 ? (
                  <View className="flex-row gap-x-0.5 mt-1">
                    {dayEvents.slice(0, 2).map((post) => (
                      <View
                        key={postKey(post)}
                        className="size-1.5 rounded-full bg-primary"
                      />
                    ))}
                    {hidden > 0 ? (
                      <ThemedText className="text-muted-foreground text-[8px]">
                        +{hidden}
                      </ThemedText>
                    ) : null}
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="mt-4">
        <ThemedText className="mb-2 text-sm font-semibold">
          {selectedLabel}
        </ThemedText>
        {selectedEvents.length === 0 ? (
          <ThemedText className="text-muted-foreground text-sm">
            {t('events.calendar.emptyDay', { defaultValue: 'No events' })}
          </ThemedText>
        ) : (
          selectedEvents.map((post, index) => (
            <Pressable
              key={postKey(post)}
              onPress={() => openEvent(post)}
              className={cn(
                'flex-row items-baseline gap-x-3 rounded-md px-2 py-2',
                index > 0 && 'border-t border-border'
              )}
            >
              <EventTime post={post} />
              <ThemedText className="font-medium flex-1">
                {calendarEventName(post)}
              </ThemedText>
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
};

const EventTime = ({ post }: { post: PublicPost }) => {
  const { t } = useTranslation();
  if (post.data.type === 'event' && post.data.wholeDay) {
    return (
      <ThemedText className="text-muted-foreground text-sm">
        {t('events.calendar.allDay', { defaultValue: 'All day' })}
      </ThemedText>
    );
  }
  const startIso = eventStartIso(post);
  const start = startIso ? new Date(startIso) : undefined;
  const endIso = eventEndIso(post);
  const end = endIso ? new Date(endIso) : undefined;
  const fmt = (date: Date) =>
    date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const time = start ? fmt(start) : '';
  const endTime =
    end && start && end.getTime() !== start.getTime() ? fmt(end) : '';
  return (
    <ThemedText className="text-muted-foreground text-sm">
      {endTime ? `${time} – ${endTime}` : time}
    </ThemedText>
  );
};
