import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import type { MediaAttachmentData } from '@openpeepshq/common/types';
import { useT } from '../../../i18n';

export const isAudioAttachment = (
  att: Pick<MediaAttachmentData, 'type' | 'meta'>,
): boolean =>
  att.type === 'audio' || !!att.meta?.mimetype?.startsWith('audio/');

export interface AudioAttachmentProps {
  src?: string;
  /** File name shown above the controls. */
  label?: string;
  /** Byte size, shown next to the file name when known. */
  size?: number;
  /** Leave room for controls overlaid on the top-right corner. */
  reserveEnd?: boolean;
  className?: string;
}

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const ss = String(secs).padStart(2, '0');
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  }
  return `${minutes}:${ss}`;
};

const formatBytes = (bytes?: number): string | undefined => {
  if (!bytes || bytes <= 0) return undefined;
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
};

export const AudioAttachment = ({
  src,
  label,
  size,
  reserveEnd = false,
  className = '',
}: AudioAttachmentProps) => {
  const t = useT();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrent(0);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('durationchange', onMeta);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    onMeta();
    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('durationchange', onMeta);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const playLabel = t('posts.audio.play', { defaultValue: 'Play audio' });
  const pauseLabel = t('posts.audio.pause', { defaultValue: 'Pause audio' });
  const seekLabel = t('posts.audio.seek', { defaultValue: 'Seek' });
  const lengthLabel = t('posts.audio.length', { defaultValue: 'Length' });
  const playerLabel = t('common.media.audioPlayer', {
    defaultValue: 'Audio player',
  });
  const fileSize = formatBytes(size);
  const length = duration > 0 ? formatTime(duration) : '–:––';
  const elapsed = formatTime(current);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrent(value);
  };

  const canPlay = !!src;

  return (
    <div
      role="group"
      aria-label={label ? `${playerLabel}: ${label}` : playerLabel}
      className={`border-border bg-surface flex w-full flex-col gap-1.5 rounded-md border px-3 py-2 ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={`flex flex-col gap-1.5 ${reserveEnd ? 'pr-12' : ''}`}>
        {label || fileSize ? (
          <div className="flex items-baseline justify-between gap-3">
            {label ? (
              <p className="min-w-0 truncate text-sm font-medium">{label}</p>
            ) : (
              <span />
            )}
            {fileSize ? (
              <span className="text-muted-foreground shrink-0 text-xs">
                {fileSize}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            title={playing ? pauseLabel : playLabel}
            aria-label={playing ? pauseLabel : playLabel}
            disabled={!canPlay}
            onClick={togglePlay}
            className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full disabled:opacity-50"
          >
            {playing ? (
              <Pause className="size-3.5" aria-hidden="true" />
            ) : (
              <Play className="size-3.5 translate-x-px" aria-hidden="true" />
            )}
          </button>
          <span className="text-muted-foreground w-12 shrink-0 text-xs tabular-nums">
            {elapsed}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(current, duration || 0)}
            disabled={!canPlay || duration <= 0}
            aria-label={seekLabel}
            onChange={(e) => seek(Number(e.target.value))}
            className="accent-primary h-1 min-w-0 flex-1"
          />
          <span
            className="text-muted-foreground w-12 shrink-0 text-right text-xs tabular-nums"
            title={lengthLabel}
          >
            {length}
          </span>
        </div>
      </div>

      {src ? (
        <audio
          ref={audioRef}
          src={src}
          preload="metadata"
          className="sr-only"
        />
      ) : null}
    </div>
  );
};
