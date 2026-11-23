import { useEffect, useRef, useState } from 'react';
import { Check, Mic, Pause, Play, RotateCcw, Square } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';
import {
  VOICE_NOTE_AUTO_STOP_SECONDS,
  VOICE_NOTE_MAX_SECONDS,
} from '@openpeepshq/common';

/**
 * Picks the first MediaRecorder type the browser can actually encode.
 * `audio/mp4` is the *desired output* — AAC-in-MP4 is the one format every
 * client (incl. iOS) decodes natively — but Chrome and Firefox cannot encode
 * it, so there the browser records webm/opus (or ogg) and the server
 * normalizes the uploaded file to AAC-in-MP4. The extension handed to the
 * composer follows the format actually recorded, which keeps the reported
 * name/mimetype honest until normalization.
 */
const pickMimeType = (): string =>
  [
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ].find(
    (type) =>
      typeof MediaRecorder !== 'undefined' &&
      MediaRecorder.isTypeSupported(type),
  ) ?? '';

const extensionFor = (mimeType: string): string => {
  // Invariant with web's audio gate (ComposeAttachments.enqueueFile): a
  // recorded take is classified `post-audio` from `file.type` first — the
  // extension-regex fallback only fires for files whose mime is blank.
  // `file.type` here is `blob.type || 'audio/webm'`, so every extension this
  // map can produce must correspond to a container whose MediaRecorder mime
  // starts with `audio/`. If a future branch maps a mime to a non-audio
  // container (or a blob type stops carrying `audio/`), web would silently
  // route a recorded take to `post-document` instead of `post-audio`.
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  return 'webm';
};

const formatTime = (totalSeconds: number): string =>
  `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;

export interface VoiceRecorderModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (file: File) => void;
}

type Phase = 'idle' | 'recording' | 'paused' | 'recorded';

/**
 * Records a voice note from the microphone (up to VOICE_NOTE_MAX_SECONDS)
 * and hands the result to the composer as a regular audio file attachment.
 */
export const VoiceRecorderModal = ({
  open,
  onClose,
  onConfirm,
}: VoiceRecorderModalProps) => {
  const t = useT();
  const [phase, setPhase] = useState<Phase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const previewUrlRef = useRef<string | null>(null);
  // set when the dialog is cancelled so the recorder's onstop drops the data
  const discardRef = useRef(false);
  const disposedRef = useRef(false);
  // wall-clock tracking: interval ticks are throttled in background tabs, so
  // the displayed time and the auto-stop derive from Date.now() deltas
  const accumulatedMsRef = useRef(0);
  const segmentStartedAtRef = useRef<number | null>(null);

  const elapsedMs = () =>
    accumulatedMsRef.current +
    (segmentStartedAtRef.current !== null
      ? Date.now() - segmentStartedAtRef.current
      : 0);

  const setPreview = (url: string | null) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const reset = () => {
    setPreview(null);
    setBlob(null);
    setSeconds(0);
    setMicError(null);
    accumulatedMsRef.current = 0;
    segmentStartedAtRef.current = null;
    setPhase('idle');
  };

  const stopRecording = () => recorderRef.current?.stop();

  const startRecording = async () => {
    discardRef.current = false;
    setMicError(null);
    setPreview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stopStream();
        if (disposedRef.current) return;
        if (discardRef.current) {
          discardRef.current = false;
          return;
        }
        const type = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type });
        setBlob(audioBlob);
        setPreview(URL.createObjectURL(audioBlob));
        setPhase('recorded');
      };
      recorder.start();
      accumulatedMsRef.current = 0;
      segmentStartedAtRef.current = Date.now();
      setSeconds(0);
      setPhase('recording');
    } catch {
      stopStream();
      setPhase('idle');
      setMicError(
        t('posts.form.voiceNote.micError', {
          defaultValue: 'Microphone unavailable or access denied.',
        }),
      );
    }
  };

  const confirm = () => {
    if (!blob) return;
    const type = blob.type || 'audio/webm';
    // The name is user-visible (composer card + attachment description shown
    // to every reader), so it comes from a locale key, not a hardcoded
    // English string.
    const baseName = t('posts.form.voiceNote.filename', {
      defaultValue: 'Voice note',
    });
    onConfirm(new File([blob], `${baseName}.${extensionFor(type)}`, { type }));
    reset();
    onClose();
  };

  const cancel = () => {
    const recorder = recorderRef.current;
    // Mark for discard whenever a recorder exists — not only while
    // `state !== 'inactive'`. MediaRecorder's `stop` is asynchronous: right
    // after Stop, `state` is already `inactive` but the queued `onstop` has
    // not run yet, and a cancel in that window (overlay click / Esc) must
    // still drop the pending take. The flag is safe to leave set:
    // `startRecording()` resets it, and the existing "close while idle"
    // guard covers a cancel with no take in flight.
    if (recorder) {
      discardRef.current = true;
      if (recorder.state !== 'inactive') recorder.stop();
    }
    stopStream();
    recorderRef.current = null;
    reset();
    onClose();
  };

  // Ticks display the wall-clock elapsed time and enforce the hard cap.
  // The auto-stop threshold is half a second *under* the cap: this tick is
  // 500 ms coarse, and the take's probed duration is the raw wall-clock
  // span, so stopping at exactly 90 s would let ~half of honest cap-length
  // takes probe above the server's `> VOICE_NOTE_MAX_SECONDS` check. See
  // `VOICE_NOTE_AUTO_STOP_SECONDS` (common) for the boundary story.
  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => {
      setSeconds(Math.floor(elapsedMs() / 1000));
      if (elapsedMs() >= VOICE_NOTE_AUTO_STOP_SECONDS * 1000) {
        stopRecording();
      }
    }, 500);
    return () => clearInterval(id);
  }, [phase]);

  // Never leak the microphone or blob URLs if the composer unmounts.
  useEffect(
    () => () => {
      disposedRef.current = true;
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const recording = phase === 'recording' || phase === 'paused';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && cancel()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <DialogTitle>
            {t('posts.form.voiceNote.title', { defaultValue: 'Voice note' })}
          </DialogTitle>
          <DialogDescription>
            {t('common.media.audio.maxLength', {
              seconds: VOICE_NOTE_MAX_SECONDS,
              defaultValue: 'Up to {{seconds}} seconds',
            })}
          </DialogDescription>
        </DialogHeader>

        {phase === 'idle' && (
          <div className="flex flex-col items-center gap-4 py-4">
            {micError && (
              <p className="text-error text-sm" role="alert">
                {micError}
              </p>
            )}
            <Button
              variant="default"
              action={() => void startRecording()}
              data-testid="voice-recorder-start"
            >
              <Mic className="size-4" aria-hidden="true" />
              {t('posts.form.voiceNote.start', {
                defaultValue: 'Start recording',
              })}
            </Button>
          </div>
        )}

        {recording && (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-2xl font-semibold tabular-nums">
              {formatTime(seconds)} / {formatTime(VOICE_NOTE_MAX_SECONDS)}
            </p>
            <div className="flex items-center gap-2">
              {phase === 'recording' ? (
                <Button
                  variant="outline"
                  title={t('posts.form.voiceNote.pause', {
                    defaultValue: 'Pause',
                  })}
                  action={() => {
                    recorderRef.current?.pause();
                    if (segmentStartedAtRef.current !== null) {
                      accumulatedMsRef.current +=
                        Date.now() - segmentStartedAtRef.current;
                      segmentStartedAtRef.current = null;
                    }
                    setSeconds(Math.floor(accumulatedMsRef.current / 1000));
                    setPhase('paused');
                  }}
                  data-testid="voice-recorder-pause"
                >
                  <Pause className="size-4" aria-hidden="true" />
                  <span className="sr-only">
                    {t('posts.form.voiceNote.pause', {
                      defaultValue: 'Pause',
                    })}
                  </span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  title={t('posts.form.voiceNote.resume', {
                    defaultValue: 'Resume',
                  })}
                  action={() => {
                    recorderRef.current?.resume();
                    segmentStartedAtRef.current = Date.now();
                    setPhase('recording');
                  }}
                  data-testid="voice-recorder-resume"
                >
                  <Play className="size-4" aria-hidden="true" />
                  <span className="sr-only">
                    {t('posts.form.voiceNote.resume', {
                      defaultValue: 'Resume',
                    })}
                  </span>
                </Button>
              )}
              <Button
                variant="default"
                title={t('posts.form.voiceNote.stop', {
                  defaultValue: 'Stop',
                })}
                action={stopRecording}
                data-testid="voice-recorder-stop"
              >
                <Square className="size-4" aria-hidden="true" />
                <span className="sr-only">
                  {t('posts.form.voiceNote.stop', { defaultValue: 'Stop' })}
                </span>
              </Button>
            </div>
          </div>
        )}

        {phase === 'recorded' && previewUrl && (
          <div className="flex flex-col gap-4 py-2">
            <audio controls src={previewUrl} className="w-full" />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                action={() => void startRecording()}
                data-testid="voice-recorder-rerecord"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                {t('posts.form.voiceNote.reRecord', {
                  defaultValue: 'Re-record',
                })}
              </Button>
              <Button
                variant="default"
                action={confirm}
                data-testid="voice-recorder-add"
              >
                <Check className="size-4" aria-hidden="true" />
                {t('posts.form.voiceNote.add', {
                  defaultValue: 'Add to post',
                })}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
