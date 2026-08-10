import { useCallback, useEffect, useRef, useState } from 'react';
import '@livekit/components-styles';
import './livekit-light-theme.css';
import type { LocalUserChoices } from '@livekit/components-react';
import type { Event, PublicPost } from '@openpeepshq/common/types';
import { jamFromEvent, getJamCapacityJoinBlock } from '@openpeepshq/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { useServerInfo } from '../server-data/context';
import { JamProvider, useJamContext } from './JamContext';
import { JamLobby } from './JamLobby';
import { JamCapacityGate } from './JamCapacityGate';
import { JamRequestJoin } from './JamRequestJoin';
import { JamVideoCall } from './JamVideoCall';
import { apiErrorMessage } from '../../lib/apiErrorMessage';

export interface JamRoomProps {
  jamPost: PublicPost;
  /** When true, connect immediately as observer without a lobby. */
  observer?: boolean;
}

type JamConnection = {
  token: string;
  livekitUrl: string;
  audio: boolean;
  video: boolean;
};

type ReconnectPrefs = {
  audio: boolean;
  video: boolean;
};

/**
 * Top-level React port of `core/jams/room/Room.svelte`. Decides whether to
 * render the lobby, the live video call, an "access denied / jam not active"
 * screen, or — for observers — auto-connects via the join token.
 *
 * Drop this into a route or page; everything below it lives inside the
 * `<JamProvider>`.
 */
export function JamRoom({ jamPost, observer = false }: JamRoomProps) {
  return (
    <JamProvider jamPost={jamPost} observer={observer}>
      <JamRoomInner />
    </JamProvider>
  );
}

function JamRoomInner() {
  const t = useT();
  const { jamPost, jam, jamEvent, observer, consumeIntentionalLeave } =
    useJamContext();
  const { openpeepsApi, client } = useOpenpeeps();
  const serverInfo = useServerInfo();
  const me = useCurrentProfile();

  const jamStateQuery = openpeepsApi.useJamState(jamPost.id);
  const postQuery = openpeepsApi.usePost(jamPost.id);
  const rsvpToEvent = openpeepsApi.rsvpToEventAction({ id: jamPost.id });
  const post = postQuery.data ?? jamPost;

  const [connection, setConnection] = useState<JamConnection | undefined>(
    undefined,
  );
  const [reconnectPrefs, setReconnectPrefs] = useState<
    ReconnectPrefs | undefined
  >(undefined);
  const [reconnectError, setReconnectError] = useState<string | undefined>();
  const [observerError, setObserverError] = useState<string | undefined>();
  const [autoRsvpError, setAutoRsvpError] = useState<string | undefined>();
  const autoRsvpStarted = useRef(false);
  const reconnectInFlight = useRef(false);
  const mounted = useRef(true);

  const livekitUrl = serverInfo.jams.livekit.url;
  const isModerator = !!me && (jam?.moderators.includes(me.id) ?? false);
  const jamActive = !!jamStateQuery.data?.active;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleJoin = ({
    token,
    livekitUrl: url,
    choices,
  }: {
    token: string;
    livekitUrl: string;
    choices?: LocalUserChoices;
  }) => {
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
    async (prefs: ReconnectPrefs) => {
      if (reconnectInFlight.current || !mounted.current) return;
      reconnectInFlight.current = true;
      setReconnectError(undefined);
      try {
        const res = await client.jams.token({
          pathParameters: { id: jamPost.id },
        });
        if (!mounted.current) return;
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
    [client, jamPost.id, livekitUrl, t],
  );

  const handleDisconnected = useCallback(() => {
    if (consumeIntentionalLeave()) {
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
  }, [consumeIntentionalLeave, tryReconnect]);

  // Retry when the page becomes visible again (mobile idle / tab freeze).
  useEffect(() => {
    if (!reconnectPrefs) return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void tryReconnect(reconnectPrefs);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [reconnectPrefs, tryReconnect]);

  const capacityBlock = (() => {
    if (!me) {
      const eventData = post.data?.type === 'event' ? post.data : undefined;
      if (eventData?.maxAttendees) {
        return { blocked: true as const, reason: 'rsvp-required' as const };
      }
      return { blocked: false as const };
    }
    return getJamCapacityJoinBlock(post, me);
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
  }, [observer, jamPost.id, client, livekitUrl, t]);

  useEffect(() => {
    if (!shouldAutoRsvp || autoRsvpStarted.current) return;
    autoRsvpStarted.current = true;
    let cancelled = false;
    (async () => {
      try {
        await rsvpToEvent({ response: 'yes' });
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

  if (connection) {
    return (
      <JamVideoCall
        token={connection.token}
        serverUrl={connection.livekitUrl}
        audio={connection.audio}
        video={connection.video}
        onDisconnected={handleDisconnected}
      />
    );
  }

  if (reconnectPrefs) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4">
        <span className="text-center text-lg">
          {t('jams.room.reconnecting', {
            defaultValue: 'Reconnecting to the jam…',
          })}
        </span>
        {reconnectError ? (
          <span className="text-destructive text-center text-sm">
            {reconnectError}
          </span>
        ) : null}
      </div>
    );
  }

  if (observer) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {observerError ? (
          <span className="text-destructive text-center text-sm">
            {observerError}
          </span>
        ) : (
          <span className="text-center text-lg">
            {t('jams.room.observerConnecting', {
              defaultValue: 'Connecting as observer…',
            })}
          </span>
        )}
      </div>
    );
  }

  if (shouldAutoRsvp && !autoRsvpError) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-center text-lg">
          {t('jams.room.autoRsvpInProgress', {
            defaultValue: 'Registering you for this event…',
          })}
        </span>
      </div>
    );
  }

  if (capacityBlock.blocked) {
    return (
      <JamCapacityGate
        jamPost={post}
        reason={capacityBlock.reason}
        eventName={jamEvent.name}
      />
    );
  }

  const canDirectJoin = isModerator || (jamActive && !jam?.waitingRoom);
  const canRequestJoin = !isModerator && !!jam?.waitingRoom;

  if (canDirectJoin) {
    return <JamLobby onJoin={handleJoin} />;
  }

  if (canRequestJoin) {
    return <JamRequestJoin onJoin={handleJoin} />;
  }

  return (
    <div className="mx-auto flex h-full w-full items-center justify-center p-4">
      <div className="space-y-5 text-center">
        <h3 className="text-lg">{jamEvent.name}</h3>
        <div className="bg-surface-100 flex w-full flex-col items-center justify-center space-y-3 rounded border p-4">
          <span>
            {t('jams.room.jamNotActive', {
              defaultValue: 'This jam is not active right now.',
            })}
          </span>
          {me ? (
            <a
              href="/jams"
              className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm"
            >
              {t('jams.discover.checkOtherJams', {
                defaultValue: 'Check other jams',
              })}
            </a>
          ) : (
            <>
              <a
                href="/auth/register"
                className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm"
              >
                {t('navigation.joinCommunity', {
                  defaultValue: 'Join the community',
                })}
              </a>
              <span>
                {t('navigation.haveAccount', {
                  defaultValue: 'Already have an account?',
                })}{' '}
                <a href="/auth/login" className="underline">
                  {t('navigation.logIn', { defaultValue: 'Log in' })}
                </a>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Convenience helper for callers that have a `PublicPost` of any type. */
export function isJamPost(post: PublicPost): boolean {
  return (
    (post.data as Event | undefined)?.type === 'event' && !!jamFromEvent(post)
  );
}

export type { LocalUserChoices };
