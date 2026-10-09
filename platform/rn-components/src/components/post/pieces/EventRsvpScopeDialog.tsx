import React, { forwardRef, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import type { PublicPost } from '@openpeepshq/common/types';
import type { ExpandedOccurrence } from '@openpeepshq/common/lib';
import {
  countYesRsvps,
  getEffectiveRsvp,
  isCapacityEvent,
  seriesYesBlockedByCapacity,
} from '@openpeepshq/common/lib';
import { BaseSheet, SheetFooter } from '../../custom/modals/common';
import { Checkbox } from '../../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { ThemedText } from '../../ui/themed-text';
import { useOpenpeeps } from '@openpeepshq/react';
import { bottomSheetClose } from '../../../lib/bottom-sheet-ref';

export type RsvpScopeChoice =
  | { kind: 'this'; recurrenceId: string }
  | { kind: 'selected'; recurrenceIds: string[] }
  | { kind: 'series' };

type ScopeKind = 'this' | 'selected' | 'series';

export interface EventRsvpScopeDialogProps {
  post: PublicPost;
  response: 'yes' | 'tentative' | 'no';
  defaultRecurrenceId?: string;
  occurrences: ExpandedOccurrence[];
  error?: string | null;
  isLoading?: boolean;
  onConfirm: (scope: RsvpScopeChoice) => void | Promise<void>;
}

const formatOccurrenceStart = (start: string) =>
  new Date(start).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const EventRsvpScopeDialog = forwardRef<
  BottomSheetModal,
  EventRsvpScopeDialogProps
>(
  (
    {
      post,
      response,
      defaultRecurrenceId,
      occurrences,
      error,
      isLoading,
      onConfirm,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const { currentProfile } = useOpenpeeps();
    const event = post.data?.type === 'event' ? post.data : undefined;
    const capacityEvent = event ? isCapacityEvent(event) : false;
    const seriesFull =
      response === 'yes' &&
      !!currentProfile &&
      seriesYesBlockedByCapacity(post, currentProfile.id);
    const occurrenceIsFull = (recurrenceId: string) =>
      response === 'yes' &&
      capacityEvent &&
      event?.maxAttendees !== undefined &&
      getEffectiveRsvp(post, currentProfile?.id ?? '', recurrenceId)
        ?.response !== 'yes' &&
      countYesRsvps(post, recurrenceId) >= event.maxAttendees;
    const currentFull =
      !!defaultRecurrenceId && occurrenceIsFull(defaultRecurrenceId);
    const initialScope: ScopeKind = currentFull
      ? 'selected'
      : defaultRecurrenceId
        ? 'this'
        : 'series';
    const [scope, setScope] = useState<ScopeKind>(initialScope);
    const [selected, setSelected] = useState<string[]>(
      defaultRecurrenceId ? [defaultRecurrenceId] : []
    );

    useEffect(() => {
      setScope(initialScope);
      setSelected(defaultRecurrenceId ? [defaultRecurrenceId] : []);
    }, [defaultRecurrenceId, response, initialScope]);

    const defaultLabel = defaultRecurrenceId
      ? formatOccurrenceStart(
          occurrences.find(
            (occurrence) => occurrence.recurrenceId === defaultRecurrenceId
          )?.start ?? defaultRecurrenceId
        )
      : undefined;

    const openSelected = selected.filter((id) => !occurrenceIsFull(id));
    const confirmDisabled =
      !!isLoading ||
      (scope === 'this' && !defaultRecurrenceId) ||
      (scope === 'selected' && openSelected.length === 0) ||
      (scope === 'series' && seriesFull);

    const toggleSelected = (recurrenceId: string, next: boolean) => {
      setSelected((ids) =>
        next ? [...ids, recurrenceId] : ids.filter((id) => id !== recurrenceId)
      );
    };

    const confirm = () => {
      if (scope === 'this' && defaultRecurrenceId) {
        return onConfirm({
          kind: 'this',
          recurrenceId: defaultRecurrenceId,
        });
      }
      if (scope === 'selected') {
        return onConfirm({ kind: 'selected', recurrenceIds: openSelected });
      }
      return onConfirm({ kind: 'series' });
    };

    return (
      <BaseSheet ref={ref} snapPoints={['80%']} scrollable>
        <View className="flex-1 p-4">
          <ThemedText className="text-center text-lg mb-4">
            {t('events.rsvp.scope.title')}
          </ThemedText>
          <RadioGroup
            value={scope}
            onValueChange={(value) => setScope(value as ScopeKind)}
          >
            {defaultRecurrenceId && !currentFull ? (
              <Pressable
                onPress={() => setScope('this')}
                className="py-3 flex-row items-center gap-x-3"
              >
                <RadioGroupItem value="this" />
                <ThemedText className="flex-1">
                  {t('events.rsvp.scope.thisDateWith', {
                    date: defaultLabel,
                  })}
                </ThemedText>
              </Pressable>
            ) : null}
            {occurrences.length > 0 ? (
              <Pressable
                onPress={() => setScope('selected')}
                className="py-3 flex-row items-center gap-x-3"
              >
                <RadioGroupItem value="selected" />
                <ThemedText>{t('events.rsvp.scope.selectedDates')}</ThemedText>
              </Pressable>
            ) : null}
            {currentFull ? null : (
              <Pressable
                onPress={() => !seriesFull && setScope('series')}
                className="py-3 flex-row items-start gap-x-3"
              >
                <RadioGroupItem value="series" disabled={seriesFull} />
                <View className="flex-1">
                  <ThemedText>{t('events.rsvp.scope.wholeSeries')}</ThemedText>
                  {seriesFull ? (
                    <ThemedText className="text-muted-foreground text-xs mt-1">
                      {t('events.rsvp.scope.seriesFull')}
                    </ThemedText>
                  ) : null}
                </View>
              </Pressable>
            )}
          </RadioGroup>
          {scope === 'selected' ? (
            <View className="mt-2">
              {occurrences.map((occurrence) => {
                const full = occurrenceIsFull(occurrence.recurrenceId);
                const lockedOn =
                  full && occurrence.recurrenceId === defaultRecurrenceId;
                const checked =
                  lockedOn || selected.includes(occurrence.recurrenceId);
                return (
                  <Pressable
                    key={occurrence.recurrenceId}
                    disabled={full}
                    onPress={() =>
                      toggleSelected(occurrence.recurrenceId, !checked)
                    }
                    className="py-2 flex-row items-center gap-x-3"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={full}
                      onCheckedChange={(value) =>
                        toggleSelected(occurrence.recurrenceId, value === true)
                      }
                    />
                    <ThemedText
                      className={`flex-1 ${
                        full ? 'text-muted-foreground' : ''
                      }`}
                    >
                      {formatOccurrenceStart(occurrence.start)}
                      {full ? ` — ${t('events.rsvp.full')}` : ''}
                    </ThemedText>
                  </Pressable>
                );
              })}
              {openSelected.length === 0 ? (
                <ThemedText className="text-muted-foreground text-sm">
                  {t('events.rsvp.scope.selectAtLeastOne')}
                </ThemedText>
              ) : null}
            </View>
          ) : null}
          {error ? (
            <ThemedText className="text-destructive text-sm mt-2">
              {error}
            </ThemedText>
          ) : null}
          <SheetFooter
            onCancel={() => bottomSheetClose(ref)}
            onConfirm={confirm}
            confirmText={t('events.rsvp.scope.confirm')}
            cancelText={t('events.rsvp.scope.cancel')}
            disabled={confirmDisabled}
            isLoading={isLoading}
          />
        </View>
      </BaseSheet>
    );
  }
);

EventRsvpScopeDialog.displayName = 'EventRsvpScopeSheet';
