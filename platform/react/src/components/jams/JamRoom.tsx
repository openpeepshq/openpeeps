import { useEffect, useState } from 'react';
import '@livekit/components-styles';
import './livekit-light-theme.css';
import type { LocalUserChoices } from '@livekit/components-react';
import type { Event, PublicPost } from '@openpeeps/common/types';
import { jamFromEvent } from '@openpeeps/common/lib';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { useServerInfo } from '../server-data/context';
import { JamProvider, useJamContext } from './JamContext';
import { JamLobby } from './JamLobby';
import { JamRequestJoin } from './JamRequestJoin';
import { JamVideoCall } from './JamVideoCall';

export interface JamRoomProps {
  jamPost: PublicPost;
  /** When true, connect immediately as observer without a lobby. */
  observer?: boolean;
}

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
  const { jamPost, jam, jamEvent, observer } = useJamContext();
  const { openpeepsApi, client } = useOpenpeeps();
  const serverInfo = useServerInfo();
  const me = useCurrentProfile();

  const jamStateQuery = openpeepsApi.useJamState(jamPost.id);

  const [connection, setConnection] = useState<
    | { token: string; livekitUrl: string; audio: boolean; video: boolean }
    | undefined
  >(undefined);
  const [observerError, setObserverError] = useState<string | undefined>();

  const livekitUrl = serverInfo.jams.livekit.url;
  const isModerator = !!me && (jam?.moderators.includes(me.id) ?? false);
  const jamActive = !!jamStateQuery.data?.active;

  const handleJoin = ({
    token,
    livekitUrl: url,
    choices,
  }: {
    token: string;
    livekitUrl: string;
    choices?: LocalUserChoices;
  }) => {
    setConnection({
      token,
      livekitUrl: url ?? livekitUrl,
      audio: choices?.audioEnabled ?? true,
      video: choices?.videoEnabled ?? true,
    });
  };

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
              (res as { error?: { message?: string } }).error?.message ??
                t('jams.lobby.tokenError', {
                  defaultValue: 'Failed to get jam token',
                }),
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
          setObserverError((err as Error).message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [observer, jamPost.id, client, livekitUrl, t]);

  if (connection) {
    return (
      <JamVideoCall
        token={connection.token}
        serverUrl={connection.livekitUrl}
        audio={connection.audio}
        video={connection.video}
        onDisconnected={() => setConnection(undefined)}
      />
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
