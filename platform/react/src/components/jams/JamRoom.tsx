import { useEffect } from 'react';
import '@livekit/components-styles';
import './livekit-light-theme.css';
import type { LocalUserChoices } from '@livekit/components-react';
import type { Event, PublicPost } from '@openpeepshq/common/types';
import { jamFromEvent } from '@openpeepshq/common/lib';
import { useT } from '../../i18n';
import { useJamRoom } from '../../hooks/jams/useJamRoom';
import { JamProvider } from './JamContext';
import { JamLobby } from './JamLobby';
import { JamCapacityGate } from './JamCapacityGate';
import { JamRequestJoin } from './JamRequestJoin';
import { JamVideoCall } from './JamVideoCall';

export interface JamRoomProps {
  jamPost: PublicPost;
  /** When true, connect immediately as observer without a lobby. */
  observer?: boolean;
  occurrence?: string;
}

/**
 * Top-level React port of `core/jams/room/Room.svelte`. Decides whether to
 * render the lobby, the live video call, an "access denied / jam not active"
 * screen, or — for observers — auto-connects via the join token.
 *
 * Drop this into a route or page; everything below it lives inside the
 * `<JamProvider>`.
 */
export function JamRoom({
  jamPost,
  observer = false,
  occurrence,
}: JamRoomProps) {
  return (
    <JamProvider jamPost={jamPost} observer={observer} occurrence={occurrence}>
      <JamRoomInner />
    </JamProvider>
  );
}

function JamRoomInner() {
  const t = useT();
  const {
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
    canDirectJoin,
    canRequestJoin,
    handleJoin,
    handleDisconnected,
    tryReconnect,
  } = useJamRoom();

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

  if (!livekitEnabled) {
    return (
      <div className="mx-auto flex h-full w-full items-center justify-center p-4">
        <div className="w-full max-w-md space-y-5 text-center">
          <h3 className="text-lg">{jamEvent.name}</h3>
          <div className="bg-surface flex w-full flex-col items-center justify-center space-y-3 rounded border p-4">
            <p role="status">
              {t('jams.unavailable.message', {
                defaultValue:
                  'Jams are unavailable because LiveKit is not connected.',
              })}
            </p>
            <a
              href={`/posts/${jamPost.id}`}
              className="text-primary text-sm underline"
            >
              {t('jams.room.viewEvent', { defaultValue: 'View event' })}
            </a>
          </div>
        </div>
      </div>
    );
  }

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
        occurrence={occurrence}
      />
    );
  }

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
        <div className="bg-surface flex w-full flex-col items-center justify-center space-y-3 rounded border p-4">
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
