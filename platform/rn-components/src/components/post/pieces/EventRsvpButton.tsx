import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import type { PublicPost } from '@openpeepshq/common/types';
import { useEventRsvp } from '@openpeepshq/react';
import { Button } from '../../ui/button';
import { ThemedText } from '../../ui/themed-text';
import { bottomSheetPresent } from '../../../lib/bottom-sheet-ref';
import {
  EventRsvpScopeDialog,
  type RsvpScopeChoice,
} from './EventRsvpScopeDialog';
import { EventWaitlistJoinDialog } from './EventWaitlistJoinDialog';

export interface EventRsvpButtonProps {
  post: PublicPost;
  recurrenceId?: string;
  lockToOccurrence?: boolean;
}

export const EventRsvpButton = ({
  post,
  recurrenceId,
  lockToOccurrence = false,
}: EventRsvpButtonProps) => {
  const { t } = useTranslation();
  const scopeSheetRef = useRef<BottomSheetModal>(null);
  const waitlistSheetRef = useRef<BottomSheetModal>(null);
  const {
    profile,
    myEvent,
    myRsvp,
    canRsvp,
    rsvpClosed,
    recurring,
    defaultId,
    occurrences,
    capacityEvent,
    full,
    onWaitlist,
    offerExpiresAt,
    error,
    pending,
    confirmingWaitlist,
    setConfirmingWaitlist,
    submitting,
    requestRespond,
    requestJoinWaitlist,
    confirmJoinWaitlist,
    claimSpot,
    confirmScope,
  } = useEventRsvp({
    post,
    recurrenceId,
    lockToOccurrence,
    onSuccess: () =>
      Toast.show({ type: 'success', text1: t('posts.rsvp.success') }),
    onError: (message) => Toast.show({ type: 'error', text1: message }),
  });

  const showScopeSheet = Boolean(pending && recurring && !lockToOccurrence);
  useEffect(() => {
    if (showScopeSheet) bottomSheetPresent(scopeSheetRef);
  }, [showScopeSheet]);
  useEffect(() => {
    if (confirmingWaitlist) bottomSheetPresent(waitlistSheetRef);
  }, [confirmingWaitlist]);

  const onConfirmScope = async (scope: RsvpScopeChoice) => {
    const ok = await confirmScope(scope);
    if (ok) scopeSheetRef.current?.close();
  };

  if (myEvent || !profile) return null;
  if (!canRsvp && !(myRsvp && myRsvp.response !== 'no')) return null;

  if (myRsvp?.response === 'removed') {
    return (
      <ThemedText className="mt-4 text-center text-sm text-muted-foreground">
        {t('events.rsvp.removedMessage')}
      </ThemedText>
    );
  }

  if (rsvpClosed) {
    return (
      <View className="mt-4 w-full">
        {myRsvp && myRsvp.response !== 'no' ? (
          <ThemedText className="text-center text-sm">
            {myRsvp.response === 'yes'
              ? t('posts.rsvp.attendingMessage')
              : myRsvp.response === 'waitlist'
                ? t('events.rsvp.onWaitlist')
                : t('posts.rsvp.maybeMessage')}
          </ThemedText>
        ) : null}
        <ThemedText className="mt-2 text-center text-sm text-muted-foreground">
          {t('events.rsvp.ended')}
        </ThemedText>
      </View>
    );
  }

  const scopeDialog = (
    <EventRsvpScopeDialog
      ref={scopeSheetRef}
      post={post}
      response={pending ?? 'yes'}
      defaultRecurrenceId={defaultId}
      occurrences={occurrences}
      error={error}
      isLoading={submitting}
      onConfirm={onConfirmScope}
    />
  );

  const errorText =
    error && !pending ? (
      <ThemedText className="mt-2 text-center text-sm text-destructive">
        {error}
      </ThemedText>
    ) : null;

  const waitlistDialog = (
    <EventWaitlistJoinDialog
      ref={waitlistSheetRef}
      post={post}
      error={error}
      isLoading={submitting}
      onClose={() => {
        if (!submitting) setConfirmingWaitlist(false);
      }}
      onConfirm={async () => {
        const ok = await confirmJoinWaitlist();
        if (ok) waitlistSheetRef.current?.close();
      }}
    />
  );

  if (offerExpiresAt) {
    return (
      <View className="mt-4 w-full">
        <ThemedText className="text-center text-sm">
          {t('events.rsvp.offerOpen', {
            until: new Date(offerExpiresAt).toLocaleString(),
          })}
        </ThemedText>
        <Button
          className="mt-2 w-full"
          disabled={submitting}
          onPress={claimSpot}
        >
          <ThemedText>{t('events.rsvp.claimSpot')}</ThemedText>
        </Button>
        <Button
          variant="outline"
          className="mt-2 w-full"
          disabled={submitting}
          onPress={() => requestRespond('no')}
        >
          <ThemedText className="text-destructive">
            {t('events.rsvp.leaveWaitlist')}
          </ThemedText>
        </Button>
        {errorText}
      </View>
    );
  }

  if (onWaitlist) {
    return (
      <View className="mt-4 w-full">
        <ThemedText className="text-center text-sm">
          {t('events.rsvp.onWaitlist')}
        </ThemedText>
        <ThemedText className="mt-1 text-center text-sm text-muted-foreground">
          {t('events.rsvp.atCapacity')}
        </ThemedText>
        <Button
          variant="outline"
          className="mt-2 w-full"
          disabled={submitting}
          onPress={() => requestRespond('no')}
        >
          <ThemedText className="text-destructive">
            {t('events.rsvp.leaveWaitlist')}
          </ThemedText>
        </Button>
        {errorText}
        {scopeDialog}
      </View>
    );
  }

  if (myRsvp && myRsvp.response !== 'no') {
    return (
      <View className="w-full">
        <Button
          variant="outline"
          className="w-full"
          disabled={submitting}
          onPress={() => requestRespond('no')}
        >
          <ThemedText className="text-destructive">
            {t('posts.rsvp.cancelRegistration')}
          </ThemedText>
        </Button>
        <ThemedText className="mt-2 text-center text-sm">
          {myRsvp.response === 'yes'
            ? t('posts.rsvp.attendingMessage')
            : t('posts.rsvp.maybeMessage')}
        </ThemedText>
        {errorText}
        {scopeDialog}
      </View>
    );
  }

  return (
    <View className="mt-4 w-full">
      {full ? (
        <ThemedText className="mb-2 text-center text-sm text-muted-foreground">
          {t('events.rsvp.atCapacity')}
        </ThemedText>
      ) : null}
      <View className="w-full flex-col gap-2">
        <Button
          className="w-full"
          disabled={submitting}
          onPress={() => (full ? requestJoinWaitlist() : requestRespond('yes'))}
        >
          <ThemedText numberOfLines={1}>
            {full ? t('events.rsvp.joinWaitlist') : t('posts.rsvp.register')}
          </ThemedText>
        </Button>
        <View className="w-full flex-row gap-x-2">
          {!capacityEvent ? (
            <Button
              variant="ghost"
              className="flex-1"
              disabled={submitting}
              onPress={() => requestRespond('tentative')}
            >
              <ThemedText numberOfLines={1} className="text-muted-foreground">
                {t('posts.rsvp.maybe')}
              </ThemedText>
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="flex-1"
            disabled={submitting}
            onPress={() => requestRespond('no')}
          >
            <ThemedText numberOfLines={1} className="text-destructive">
              {t('posts.rsvp.no')}
            </ThemedText>
          </Button>
        </View>
      </View>
      {error && !pending && !confirmingWaitlist ? errorText : null}
      {scopeDialog}
      {waitlistDialog}
    </View>
  );
};
