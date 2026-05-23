import { useMemo, useState } from 'react';
import { Circle, Link2, PhoneOff, Square } from 'lucide-react';
import { Button } from '@openpeeps/react-ui';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { useJamContext } from './JamContext';

export function JamModeratorToolbar() {
  const t = useT();
  const navigate = useNavigate();
  const me = useCurrentProfile();
  const { jamPost, jam, observer } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const closeJam = openpeepsApi.closeJamAction({ id: jamPost.id });
  const startRecording = openpeepsApi.startRecordingAction({ id: jamPost.id });
  const stopRecording = openpeepsApi.stopRecordingAction({ id: jamPost.id });
  const observerLinkQuery = openpeepsApi.useObserverLink(jamPost.id);
  const eventsQuery = openpeepsApi.useJamEvents(jamPost.id);

  const [busy, setBusy] = useState(false);

  const isModerator = !!me && jam.moderators.includes(me.id);
  const recordingActive = useMemo(() => {
    const events = [...(eventsQuery.data ?? [])].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const lastStart = events.find((event) => event.type === 'recordStart');
    const lastStop = events.find((event) => event.type === 'recordStop');
    return (
      !!lastStart &&
      (!lastStop || new Date(lastStart.createdAt) > new Date(lastStop.createdAt))
    );
  }, [eventsQuery.data]);

  if (!isModerator || observer) return null;

  const observerUrl =
    typeof window !== 'undefined' && observerLinkQuery.data?.path
      ? `${window.location.origin}${observerLinkQuery.data.path}`
      : null;

  const copyObserverLink = async () => {
    if (!observerUrl) return;
    await navigator.clipboard.writeText(observerUrl);
  };

  const toggleRecording = async () => {
    setBusy(true);
    try {
      if (recordingActive) await stopRecording();
      else await startRecording();
    } finally {
      setBusy(false);
    }
  };

  const endJam = async () => {
    if (
      !window.confirm(
        t('jams.close.confirm', {
          defaultValue: 'End this jam for everyone?',
        }),
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await closeJam();
      navigate('/jams');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pointer-events-none fixed left-4 top-4 z-50 flex flex-col gap-2">
      <div className="bg-card pointer-events-auto flex flex-wrap items-center gap-2 rounded-lg border p-2 shadow-lg">
        <Button
          variant="variant-ringed-surface"
          compact
          disabled={busy}
          action={toggleRecording}
          title={
            recordingActive
              ? t('jams.recording.stop', { defaultValue: 'Stop recording' })
              : t('jams.recording.start', { defaultValue: 'Start recording' })
          }
        >
          {recordingActive ? (
            <Square className="size-4" />
          ) : (
            <Circle className="text-error size-4 fill-current" />
          )}
        </Button>
        {observerUrl ? (
          <Button
            variant="variant-ringed-surface"
            compact
            action={copyObserverLink}
            title={t('jams.observer.copyLink', {
              defaultValue: 'Copy observer link',
            })}
          >
            <Link2 className="size-4" />
          </Button>
        ) : null}
        <Button
          variant="variant-filled-error"
          compact
          disabled={busy}
          action={endJam}
          title={t('jams.close.title', { defaultValue: 'End jam' })}
        >
          <PhoneOff className="size-4" />
        </Button>
      </div>
    </div>
  );
}
