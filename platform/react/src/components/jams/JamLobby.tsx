import { useState } from 'react';
import { X } from 'lucide-react';
import { PreJoin, type LocalUserChoices } from '@livekit/components-react';
import { Button } from '@openpeeps/react-ui';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { useJamContext } from './JamContext';
import { JamGuestForm } from './JamGuestForm';

export interface JamLobbyProps {
  /** Called once the user has picked devices and the join token has been obtained. */
  onJoin: (params: {
    token: string;
    livekitUrl: string;
    choices: LocalUserChoices;
  }) => void;
}

function canAccessJamLobby(
  profile: ReturnType<typeof useCurrentProfile>,
  jamPostId: string,
) {
  if (!profile) return false;
  if (profile.type === 'local') return true;
  return (
    profile.guestData?.resource?.type === 'jams' &&
    profile.guestData.resource.id === jamPostId
  );
}

/**
 * Pre-room screen. Guests without a jam-scoped pass see {@link JamGuestForm};
 * authenticated users get LiveKit's {@link PreJoin} device picker before join.
 */
export function JamLobby({ onJoin }: JamLobbyProps) {
  const t = useT();
  const navigate = useNavigate();
  const me = useCurrentProfile();
  const { jamPost } = useJamContext();
  const { client } = useOpenpeeps();

  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  if (!canAccessJamLobby(me, jamPost.id)) {
    return <JamGuestForm />;
  }

  const handleSubmit = async (choices: LocalUserChoices) => {
    setSubmitting(true);
    setError(undefined);
    try {
      const res = await client.jams.token({
        pathParameters: { id: jamPost.id },
      });
      if ('error' in res) {
        const message = (res as { error?: { message?: string } }).error?.message;
        setError(
          message ??
            t('jams.lobby.tokenError', {
              defaultValue: 'Failed to get jam token',
            }),
        );
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
      <div className="bg-card mb-4 flex w-full items-center justify-between rounded-md border p-3">
        <h2 className="text-lg font-semibold">
          {t('jams.lobby.readyTitle', { defaultValue: 'Ready to join' })}
        </h2>
        <Button
          compact
          variant="variant-ringed-surface"
          action={() => navigate('/jams')}
          title={t('jams.exit.title', { defaultValue: 'Leave' })}
        >
          <X className="size-4" />
        </Button>
      </div>

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
