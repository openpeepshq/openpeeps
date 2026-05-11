import { useState } from 'react';
import { PreJoin, type LocalUserChoices } from '@livekit/components-react';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useJamContext } from './JamContext';

export interface JamLobbyProps {
  /** Called once the user has picked devices and the join token has been obtained. */
  onJoin: (params: {
    token: string;
    livekitUrl: string;
    choices: LocalUserChoices;
  }) => void;
}

/**
 * Pre-room screen. Wraps LiveKit's `<PreJoin>` so the user can pick devices
 * and preview audio/video, then fetches a join token via the openpeeps API
 * before handing off to `<JamVideoCall>`.
 *
 * This is the React analog of `core/jams/lobby/Lobby.svelte` +
 * `DirectJoinButton.svelte`. The waiting-room flow (moderator approval) is
 * intentionally left as a follow-up.
 */
export function JamLobby({ onJoin }: JamLobbyProps) {
  const t = useT();
  const { jamPost } = useJamContext();
  const { client } = useOpenpeeps();

  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (choices: LocalUserChoices) => {
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await client.jams.token({
        pathParameters: { id: jamPost.id },
      });
      if ('error' in res) {
        const message = (res as { error?: { message?: string } }).error?.message;
        setError(message ?? t('jams.lobby.tokenError', { defaultValue: 'Failed to get jam token' }));
        return;
      }
      const { token, livekitUrl } = res.data;
      onJoin({ token, livekitUrl, choices });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col items-center justify-center p-4">
      <PreJoin
        onSubmit={handleSubmit}
        joinLabel={
          submitting
            ? t('jams.join.connecting', { defaultValue: 'Connecting…' })
            : t('jams.join.submit', { defaultValue: 'Join' })
        }
        micLabel={t('jams.lobby.microphone', { defaultValue: 'Microphone' })}
        camLabel={t('jams.lobby.camera', { defaultValue: 'Camera' })}
        userLabel={t('jams.lobby.name', { defaultValue: 'Your name' })}
        persistUserChoices
      />
      {error && (
        <div role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
