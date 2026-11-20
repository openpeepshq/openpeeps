import { useState, type ReactNode } from 'react';
import {
  useConnectionQualityIndicator,
  useLocalParticipant,
} from '@livekit/components-react';
import { ConnectionQuality } from 'livekit-client';
import { Circle, Eye, X } from 'lucide-react';
import { useT } from '../../i18n';
import {
  useJamRecordingElapsed,
  useJamRecordingState,
} from './jamRecordingState';
import { useJamExternalSessions } from './useJamExternalSessions';

/**
 * Red "recording" pill shown to every participant while egress is active,
 * mirroring the Svelte `RecordingIndicator` (jam recordStart/recordStop events).
 * Rendered inside `JamsBannerStack` (the stack is already inset from the
 * screen edges); `self-start ml-4` keeps its original top-left placement
 * within the stack. The pill carries no positioning of its own, so it also
 * renders standalone in a non-conference surface.
 */
export function JamRecordingIndicator() {
  const t = useT();
  const { isRecording } = useJamRecordingState();
  const elapsed = useJamRecordingElapsed();

  if (!isRecording) return null;

  return (
    <div className="bg-error/90 text-error-foreground pointer-events-none self-start ml-4 flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium shadow-lg">
      <Circle className="size-3 animate-pulse fill-current" />
      {t('events.recordingInProgress', { defaultValue: 'Recording' })}
      {elapsed ? <span className="tabular-nums">{elapsed}</span> : null}
    </div>
  );
}

/**
 * Shared stacking container for the jam's transient overlays (network
 * banner, observer banner, recording pill). Each child sits directly below
 * the previous visible one, so they can never overlap each other and any
 * future banner is added in a single place. The container owns the base top
 * offset (16px, matching the original `top-4`) and the vertical spacing;
 * the recording pill keeps its top-left placement via `self-start ml-4`.
 */
export function JamsBannerStack({ children }: { children?: ReactNode }) {
  return (
    <div className="pointer-events-none fixed left-0 top-4 z-50 flex w-full flex-col items-center gap-2">
      {children}
    </div>
  );
}

/**
 * Dismissible banner shown to participants while hidden external sessions
 * (observer links, recording/RTMP egress) are connected. Rendered inside
 * `JamsBannerStack` (below the network banner). Toasts keep priority over
 * the transparency signal, which is lower priority than user feedback —
 * hence the lower-contrast styling. The Participants list keeps the
 * presence visible after dismissal.
 */
export function JamObserverBanner() {
  const t = useT();
  const sessions = useJamExternalSessions();
  const [dismissed, setDismissed] = useState(false);

  // Dismissal is session-scoped: once acknowledged, it stays out of the way
  // for the duration of the visit, and a new batch of sessions does not
  // re-surface it.
  if (sessions <= 0 || dismissed) return null;

  return (
    <div className="bg-surface-2 text-foreground pointer-events-auto flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm shadow-lg">
      <Eye className="size-4" />
      <span>{t('jams.observers.connected', { count: sessions })}</span>
      <button
        type="button"
        title={t('jams.observers.dismiss', { defaultValue: 'Dismiss' })}
        aria-label={t('jams.observers.dismiss', { defaultValue: 'Dismiss' })}
        className="text-muted-foreground -mr-1 flex size-10 items-center justify-center"
        onClick={() => setDismissed(true)}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Dismissable banner shown when the local connection quality degrades,
 * mirroring the Svelte `NetworkQuality` component. Rendered inside
 * `JamsBannerStack` so it stacks with the other jam banners instead of
 * positioning itself.
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
    <div className="bg-warning/90 text-warning-foreground pointer-events-auto flex items-center gap-3 rounded-lg px-4 py-2 text-sm shadow-lg">
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
        aria-label={t('jams.network.dismiss', { defaultValue: 'Dismiss' })}
        className="text-muted-foreground flex size-10 items-center justify-center"
        onClick={() => setDismissed(true)}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
