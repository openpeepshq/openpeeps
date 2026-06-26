import { useState } from 'react';
import {
  useConnectionQualityIndicator,
  useLocalParticipant,
} from '@livekit/components-react';
import { ConnectionQuality } from 'livekit-client';
import { Circle, X } from 'lucide-react';
import { useT } from '../../i18n';
import { useJamRecordingState } from './jamRecordingState';

/**
 * Red "recording" pill shown to every participant while egress is active,
 * mirroring the Svelte `RecordingIndicator` (jam recordStart/recordStop events).
 */
export function JamRecordingIndicator() {
  const t = useT();
  const { isRecording } = useJamRecordingState();

  if (!isRecording) return null;

  return (
    <div className="bg-error/90 text-error-foreground pointer-events-none fixed left-4 top-4 z-50 flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium shadow-lg">
      <Circle className="size-3 animate-pulse fill-current" />
      {t('events.recordingInProgress', { defaultValue: 'Recording' })}
    </div>
  );
}

/**
 * Dismissable banner shown when the local connection quality degrades, mirroring
 * the Svelte `NetworkQuality` component.
 */
export function JamNetworkQuality() {
  const t = useT();
  const { localParticipant } = useLocalParticipant();
  const { quality } = useConnectionQualityIndicator({
    participant: localParticipant,
  });
  const [dismissed, setDismissed] = useState(false);

  const poor =
    quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost;

  if (!poor || dismissed) return null;

  return (
    <div className="bg-warning/90 text-warning-foreground fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg px-4 py-2 text-sm shadow-lg">
      <span>
        <span className="font-medium">
          {t('jams.network.connectionStatus', {
            defaultValue: 'Connection status',
          })}
        </span>{' '}
        {t('jams.network.connectionDetail', {
          defaultValue: 'Your internet connection is {{quality}}.',
          quality,
        })}
      </span>
      <button
        type="button"
        title={t('jams.network.dismiss', { defaultValue: 'Dismiss' })}
        onClick={() => setDismissed(true)}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
