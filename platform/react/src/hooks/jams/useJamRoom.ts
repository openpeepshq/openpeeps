import { useCallback, useEffect, useRef, useState } from 'react';
import { DisconnectReason } from 'livekit-client';
import { getJamCapacityJoinBlock } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { useServerInfo } from '../../components/server-data/context';
import { useJamContext } from '../../components/jams/JamContext';
import { shouldReconnectAfterDisconnect } from '../../components/jams/disconnectReason';
import { apiErrorMessage } from '../../lib/apiErrorMessage';

export type JamConnection = {
  token: string;
  livekitUrl: string;
  audio: boolean;
  video: boolean;
};

export type JamReconnectPrefs = {
  audio: boolean;
  video: boolean;
};

/** Structural subset of LiveKit's `LocalUserChoices` shared by both renderers. */
export type JamJoinChoices = {
  audioEnabled?: boolean;
  videoEnabled?: boolean;
};

export type JamJoinParams = {
  token: string;
  livekitUrl: string;
  choices?: JamJoinChoices;
};

/**
 * Room orchestration shared by web and native `JamRoom`: token/connection
 * state, reconnect after non-terminal disconnects, observer auto-connect,
 * capacity gating, auto-RSVP and the removed-from-jam state. The UI decides
 * what to render from the returned flags in this order: unavailable →
 * connection → reconnecting → observer → auto-RSVP → removed → capacity
 * gate → lobby → request join → inactive.
 */
export const useJamRoom = () => {
  const t = useT();
  const { jamPost, jam, jamEvent, observer, occurrence, isIntentionalLeave } =
    useJamContext();
  const { openpeepsApi, client } = useOpenpeeps();
  const serverInfo = useServerInfo();
  const me = useCurrentProfile();

  const jamStateQuery = openpeepsApi.useJamState(jamPost.id, occurrence);
  const postQuery = openpeepsApi.usePost(jamPost.id);
  const rsvpToEvent = openpeepsApi.rsvpToEventAction({ id: jamPost.id });
  const post = postQuery.data ?? jamPost;

  const [connection, setConnection] = useState<JamConnection | undefined>(
    undefined,
  );
  const [reconnectPrefs, setReconnectPrefs] = useState<
    JamReconnectPrefs | undefined
  >(undefined);
  const [reconnectError, setReconnectError] = useState<string | undefined>();
  const [observerError, setObserverError] = useState<string | undefined>();
  const [autoRsvpError, setAutoRsvpError] = useState<string | undefined>();
  const [removedFromJam, setRemovedFromJam] = useState(false);
  const autoRsvpStarted = useRef(false);
  const reconnectInFlight = useRef(false);
  const mounted = useRef(true);

  const livekitUrl = serverInfo.jams.livekit.url;
  const livekitEnabled = serverInfo.jams.livekit.enabled;
  const isModerator = !!me && (jam?.moderators.includes(me.id) ?? false);
  const jamActive = !!jamStateQuery.data?.active;
  // Banned on the (refetched) post: blocks the lobby and drives the
  // removed panel after a terminal PARTICIPANT_REMOVED disconnect.
  const isBanned =
    !!me &&
    !observer &&
    post.data?.type === 'event' &&
    post.data.jam?.banned?.includes(me.id) === true;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleJoin = ({ token, livekitUrl: url, choices }: JamJoinParams) => {
    setReconnectPrefs(undefined);
    setReconnectError(undefined);
    setConnection({
      token,
      livekitUrl: url ?? livekitUrl,
      audio: choices?.audioEnabled ?? true,
      video: choices?.videoEnabled ?? true,
    });
  };

  const tryReconnect = useCallback(
    async (prefs: JamReconnectPrefs) => {
      if (isIntentionalLeave()) return;
      if (reconnectInFlight.current || !mounted.current) return;
      reconnectInFlight.current = true;
      setReconnectError(undefined);
      try {
        const res = await client.jams.token({
          pathParameters: { id: jamPost.id },
          queryParameters: {
            reconnect: 'true',
            ...(occurrence && { occurrence }),
          },
        });
        if (!mounted.current || isIntentionalLeave()) {
          setReconnectPrefs(undefined);
          return;
        }
        if ('error' in res) {
          // Not admitted / jam closed — fall back to the normal gate UI.
          setReconnectPrefs(undefined);
          return;
        }
        setConnection({
          token: res.data.token,
          livekitUrl: res.data.livekitUrl ?? livekitUrl,
          audio: prefs.audio,
          video: prefs.video,
        });
        setReconnectPrefs(undefined);
      } catch (err) {
        if (!mounted.current) return;
        setReconnectError(
          apiErrorMessage(
            err,
            t,
            t('jams.lobby.tokenError', {
              defaultValue: 'Failed to get jam token',
            }),
          ),
        );
      } finally {
        reconnectInFlight.current = false;
      }
    },
    [client, isIntentionalLeave, jamPost.id, livekitUrl, occurrence, t],
  );

  const handleDisconnected = useCallback(
    (reason?: DisconnectReason) => {
      // Server-side removal (PARTICIPANT_REMOVED) is terminal: show the
      // removed panel instead of the generic not-active state.
      if (reason === DisconnectReason.PARTICIPANT_REMOVED) {
        setRemovedFromJam(true);
      }
      if (isIntentionalLeave() || !shouldReconnectAfterDisconnect(reason)) {
        setConnection(undefined);
        setReconnectPrefs(undefined);
        setReconnectError(undefined);
        return;
      }
      setConnection((current) => {
        if (!current) return undefined;
        const prefs = { audio: current.audio, video: current.video };
        setReconnectPrefs(prefs);
        queueMicrotask(() => void tryReconnect(prefs));
        return undefined;
      });
    },
    [isIntentionalLeave, tryReconnect],
  );

  const capacityBlock = (() => {
    if (me) return getJamCapacityJoinBlock(post, me, occurrence);
    // A signed-out visitor on a waiting-room jam must create a guest pass
    // (or sign in) before they can queue — the join POST refuses anonymous
    // requests. Route them to the guest-pass gate, not a silent wait screen.
    if (jam?.waitingRoom) {
      return { blocked: true as const, reason: 'guest-required' as const };
    }
    const eventData = post.data?.type === 'event' ? post.data : undefined;
    if (eventData?.maxAttendees) {
      return { blocked: true as const, reason: 'rsvp-required' as const };
    }
    return { blocked: false as const };
  })();

  const shouldAutoRsvp =
    !!me &&
    jamActive &&
    capacityBlock.blocked &&
    capacityBlock.reason === 'rsvp-required';

  useEffect(() => {
    if (!observer) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await client.jams.token({
          pathParameters: { id: jamPost.id },
          queryParameters: occurrence ? { occurrence } : undefined,
        });
        if ('error' in res) {
          if (!cancelled) {
            setObserverError(
              apiErrorMessage(
                res.error,
                t,
                t('jams.lobby.tokenError', {
                  defaultValue: 'Failed to get jam token',
                }),
              ),
            );
          }
          return;
        }
        if (cancelled) return;
        setConnection({
          token: res.data.token,
          livekitUrl: res.data.livekitUrl ?? livekitUrl,
          audio: false,
          video: false,
        });
      } catch (err) {
        if (!cancelled) {
          setObserverError(
            apiErrorMessage(
              err,
              t,
              t('jams.lobby.tokenError', {
                defaultValue: 'Failed to get jam token',
              }),
            ),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [observer, jamPost.id, client, livekitUrl, occurrence, t]);

  useEffect(() => {
    if (!shouldAutoRsvp || autoRsvpStarted.current) return;
    autoRsvpStarted.current = true;
    let cancelled = false;
    (async () => {
      try {
        await rsvpToEvent({
          response: 'yes',
          recurrenceId: occurrence,
        });
        if (!cancelled) {
          await postQuery.refetch();
        }
      } catch (err) {
        if (!cancelled) {
          autoRsvpStarted.current = false;
          setAutoRsvpError(
            apiErrorMessage(
              err,
              t,
              t('jams.room.autoRsvpError', {
                defaultValue: 'Failed to register for this event.',
              }),
            ),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shouldAutoRsvp, postQuery, rsvpToEvent, t]);

  return {
    me,
    post,
    jamPost,
    jamEvent,
    observer,
    occurrence,
    livekitEnabled,
    connection,
    reconnectPrefs,
    reconnectError,
    observerError,
    autoRsvpError,
    shouldAutoRsvp,
    capacityBlock,
    removedFromJam: removedFromJam || isBanned,
    canDirectJoin: isModerator || (jamActive && !jam?.waitingRoom),
    canRequestJoin: !isModerator && !!jam?.waitingRoom,
    handleJoin,
    handleDisconnected,
    tryReconnect,
  };
};
