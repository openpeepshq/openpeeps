import { useMemo, useState } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import type { ExpandedOccurrence } from '@openpeepshq/common/lib';
import {
  canClaimYesRsvp,
  checkPostCapabilities,
  defaultRsvpRecurrenceId,
  displayRsvpForProfile,
  effectiveEventTimes,
  eventRsvpOpen,
  isCapacityEvent,
  isRecurringEvent,
  listRsvpOccurrences,
  occurrenceHasEnded,
  offerStillOpen,
  seriesHasClaimableOccurrence,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n/context';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import {
  useAuthData,
  useCurrentProfile,
} from '../../components/layout/IdentityContext';
import { useCapabilities } from '../../components/server-data';

export type RsvpChoice = 'yes' | 'tentative' | 'no' | 'waitlist';

export type RsvpScopeChoice =
  | { kind: 'this'; recurrenceId: string }
  | { kind: 'selected'; recurrenceIds: string[] }
  | { kind: 'series' };

export type UseEventRsvpArgs = {
  post: PublicPost;
  recurrenceId?: string;
  lockToOccurrence?: boolean;
  /** Native shows toasts; web renders `error` inline. */
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

export const useEventRsvp = ({
  post,
  recurrenceId,
  lockToOccurrence = false,
  onSuccess,
  onError,
}: UseEventRsvpArgs) => {
  const t = useT();
  const profile = useCurrentProfile();
  const authData = useAuthData();
  const capabilities = useCapabilities();
  const { openpeepsApi } = useOpenpeeps();
  const rsvpToEvent = openpeepsApi.rsvpToEventAction({ id: post.id });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<RsvpChoice | null>(null);
  const [confirmingWaitlist, setConfirmingWaitlist] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const eventData = post.data?.type === 'event' ? post.data : undefined;
  const recurring = eventData ? isRecurringEvent(eventData) : false;
  const viewedTimes = eventData
    ? effectiveEventTimes(eventData, recurrenceId)
    : undefined;
  // Series home shows its first start. Once that time has passed, RSVP stays
  // off that page; upcoming dates are opened from their own links.
  const viewedEnded =
    !!viewedTimes && occurrenceHasEnded(viewedTimes.start, viewedTimes.end);
  // A selected date, or a one-off, is closed on its own end time.
  const rsvpClosed = eventData
    ? !eventRsvpOpen(
        eventData,
        recurrenceId ? { recurrenceId, lockToOccurrence: true } : undefined,
      )
    : false;
  const queriedOccurrenceClosed = !!recurrenceId && rsvpClosed;
  const defaultId = eventData
    ? defaultRsvpRecurrenceId(
        eventData,
        queriedOccurrenceClosed ? undefined : recurrenceId,
      )
    : undefined;
  const occurrences: ExpandedOccurrence[] =
    eventData && recurring ? listRsvpOccurrences(eventData) : [];
  const capacityRecurrenceId = recurring
    ? lockToOccurrence
      ? recurrenceId
      : defaultId
    : undefined;
  const capacityEvent = eventData ? isCapacityEvent(eventData) : false;
  const atCapacity =
    capacityEvent &&
    !!profile &&
    (recurring && !lockToOccurrence
      ? !seriesHasClaimableOccurrence(post, profile.id)
      : !canClaimYesRsvp(post, profile.id, capacityRecurrenceId));

  const myEvent = post.profile?.id === profile?.id;
  const myRsvp = useMemo(
    () =>
      profile
        ? displayRsvpForProfile(post, profile.id, {
            recurrenceId,
            lockToOccurrence,
          })
        : undefined,
    [post, profile, recurrenceId, lockToOccurrence],
  );
  const canRsvp = useMemo(
    () =>
      checkPostCapabilities(authData, ['core-posts-rsvp'], post, capabilities)
        .success,
    [authData, post, capabilities],
  );
  const full = atCapacity && myRsvp?.response !== 'yes';
  const onWaitlist = myRsvp?.response === 'waitlist';
  const offerExpiresAt =
    onWaitlist && offerStillOpen(myRsvp) ? myRsvp.offerExpiresAt : undefined;

  const writeRsvp = async (response: RsvpChoice, recurrenceIds?: string[]) => {
    setError(null);
    setSubmitting(true);
    try {
      if (recurrenceIds?.length === 1) {
        await rsvpToEvent({ response, recurrenceId: recurrenceIds[0] });
      } else if (recurrenceIds?.length) {
        await rsvpToEvent({ response, recurrenceIds });
      } else {
        await rsvpToEvent({ response });
      }
      onSuccess?.();
    } catch (err) {
      const message = apiErrorMessage(err, t);
      setError(message);
      onError?.(message);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const requestJoinWaitlist = () => {
    if (rsvpClosed || viewedEnded) return;
    if (!recurring || lockToOccurrence) {
      setError(null);
      setConfirmingWaitlist(true);
      return;
    }
    setError(null);
    setPending('waitlist');
  };

  const confirmJoinWaitlist = async () => {
    try {
      await writeRsvp('waitlist', recurrenceId ? [recurrenceId] : undefined);
      setConfirmingWaitlist(false);
      return true;
    } catch {
      return false;
    }
  };

  const claimSpot = () => {
    if (rsvpClosed || viewedEnded) return;
    const id = recurring
      ? (myRsvp?.recurrenceId ?? (lockToOccurrence ? recurrenceId : defaultId))
      : undefined;
    writeRsvp('yes', id ? [id] : undefined).catch(() => undefined);
  };

  const requestRespond = (response: RsvpChoice) => {
    if (rsvpClosed || viewedEnded) return;
    if (!recurring || lockToOccurrence) {
      writeRsvp(response, recurrenceId ? [recurrenceId] : undefined).catch(
        () => undefined,
      );
      return;
    }
    setError(null);
    setPending(response);
  };

  const confirmScope = async (scope: RsvpScopeChoice): Promise<boolean> => {
    if (!pending) return false;
    try {
      if (scope.kind === 'series') {
        await writeRsvp(pending);
      } else if (scope.kind === 'this') {
        await writeRsvp(pending, [scope.recurrenceId]);
      } else {
        await writeRsvp(pending, scope.recurrenceIds);
      }
      setPending(null);
      return true;
    } catch {
      return false;
    }
  };

  return {
    profile,
    myEvent,
    myRsvp,
    canRsvp,
    rsvpClosed,
    hideRsvpButton: rsvpClosed || viewedEnded,
    recurring,
    defaultId,
    occurrences,
    capacityEvent,
    full,
    onWaitlist,
    offerExpiresAt,
    error,
    pending,
    setPending,
    confirmingWaitlist,
    setConfirmingWaitlist,
    submitting,
    requestRespond,
    requestJoinWaitlist,
    confirmJoinWaitlist,
    claimSpot,
    confirmScope,
  };
};
