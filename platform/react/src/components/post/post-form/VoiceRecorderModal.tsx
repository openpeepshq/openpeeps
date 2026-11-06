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
import { VOICE_NOTE_MAX_SECONDS } from '@openpeepshq/common';

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
    onConfirm(new File([blob], `voice-note.${extensionFor(type)}`, { type }));
    reset();
    onClose();
  };

  const cancel = () => {
    const recorder = recorderRef.current;
    // Only mark for discard when an onstop will actually fire — otherwise
    // the flag sticks and the next recording's onstop drops its data.
    if (recorder && recorder.state !== 'inactive') {
      discardRef.current = true;
      recorder.stop();
    }
    stopStream();
    recorderRef.current = null;
    reset();
    onClose();
  };

  // Ticks display the wall-clock elapsed time and enforce the hard cap.
  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => {
      const elapsedSeconds = Math.floor(elapsedMs() / 1000);
      setSeconds(elapsedSeconds);
      if (elapsedSeconds >= VOICE_NOTE_MAX_SECONDS) stopRecording();
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
