import { useMemo, useState } from 'react';
import type { PublicPost } from '@openpeepshq/common/types';
import type { ExpandedOccurrence } from '@openpeepshq/common/lib';
import {
  checkPostCapabilities,
  countYesRsvps,
  defaultRsvpRecurrenceId,
  displayRsvpForProfile,
  isCapacityEvent,
  isRecurringEvent,
  listRsvpOccurrences,
  recurringEventHasOpenOccurrence,
} from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n/context';
import { apiErrorMessage } from '../../lib/apiErrorMessage';
import {
  useAuthData,
  useCurrentProfile,
} from '../../components/layout/IdentityContext';
import { useCapabilities } from '../../components/server-data';

export type RsvpChoice = 'yes' | 'tentative' | 'no';

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
  const [submitting, setSubmitting] = useState(false);

  const eventData = post.data?.type === 'event' ? post.data : undefined;
  const recurring = eventData ? isRecurringEvent(eventData) : false;
  const defaultId = eventData
    ? defaultRsvpRecurrenceId(eventData, recurrenceId)
    : undefined;
  const occurrences: ExpandedOccurrence[] =
    eventData && recurring ? listRsvpOccurrences(eventData) : [];
  const capacityRecurrenceId = lockToOccurrence ? recurrenceId : defaultId;
  const capacityEvent = eventData ? isCapacityEvent(eventData) : false;
  const atCapacity =
    capacityEvent &&
    eventData?.maxAttendees !== undefined &&
    (recurring && !lockToOccurrence
      ? !recurringEventHasOpenOccurrence(post, profile?.id)
      : countYesRsvps(post, capacityRecurrenceId) >= eventData.maxAttendees);

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

  const requestRespond = (response: RsvpChoice) => {
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
    recurring,
    defaultId,
    occurrences,
    capacityEvent,
    full,
    error,
    pending,
    setPending,
    submitting,
    requestRespond,
    confirmScope,
  };
};
