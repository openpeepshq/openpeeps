import { useEffect, useRef, useState } from 'react';
import { HlsVideo } from '@videojs/react/media/hls-video';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import type { MediaAttachmentData, MediaStream } from '@openpeepshq/common';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';

export interface VideoPlayerProps {
  attachment: MediaAttachmentData;
  autoPlay?: boolean;
  /** Browsers block unmuted autoplay; start muted so playback can begin. */
  muted?: boolean;
  className?: string;
}

type Mode = 'pending' | 'local' | 'federated';
type LocalState = 'loading' | 'processing' | 'ready' | 'error';

const POLL_INTERVAL_MS = 5_000;

const originOf = (url: string): string => {
  try {
    return new URL(url).origin;
  } catch {
    return '';
  }
};

/**
 * Plays post-attachment videos through the server's HLS VOD endpoints using the
 * `@videojs/react` (video.js v10) `HlsVideo` component, mirroring the Svelte
 * gallery `VideoPlayer`: same-origin (local) media is transcoded via
 * `createVodStream` + status polling and played through `HlsVideo`; federated
 * media falls back to the source URL on a plain `<video>`.
 */
export function VideoPlayer({
  attachment,
  autoPlay = true,
  muted = true,
  className = 'max-h-[85vh] max-w-full',
}: VideoPlayerProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const createVodStream = openpeepsApi.createVodStreamAction();
  const getVodStreamStatus = openpeepsApi.getVodStreamStatusAction();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [mode, setMode] = useState<Mode>('pending');
  const [localState, setLocalState] = useState<LocalState>('loading');
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);

  // Resolve playback mode and, for local content, drive the VOD transcode +
  // status polling until the HLS master playlist is ready.
  useEffect(() => {
    let disposed = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;

    const origin = originOf(attachment.url);
    const sameOrigin =
      typeof window !== 'undefined' && origin === window.location.origin;
    const resolvedMode: Mode = sameOrigin ? 'local' : 'federated';
    setMode(resolvedMode);
    if (resolvedMode !== 'local') return;

    const apply = (stream: MediaStream): boolean => {
      if (stream.status === 'ready') {
        setHlsUrl(openpeepsApi.vodMasterPlaylistUrl(stream.storageId, origin));
        setLocalState('ready');
        return true;
      }
      if (stream.status === 'error') {
        setLocalState('error');
        return true;
      }
      setLocalState('processing');
      return false;
    };

    const poll = (storageId: string) => {
      const tick = async () => {
        if (disposed) return;
        try {
          const status = await getVodStreamStatus({ storageId });
          if (disposed) return;
          if (apply(status)) return;
        } catch {
          // Transient blip — keep polling.
        }
        pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
      };
      pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    void (async () => {
      try {
        const stream = await createVodStream({ url: attachment.url });
        if (disposed) return;
        if (!apply(stream)) poll(stream.storageId);
      } catch {
        if (!disposed) setLocalState('error');
      }
    })();

    return () => {
      disposed = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
    // create/get actions are re-created each render; depend only on the source
    // URL so the flow runs once per attachment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.url]);

  // Best-effort autoplay once the media element can play, retrying muted if the
  // browser blocks unmuted autoplay.
  useEffect(() => {
    if (!autoPlay) return;
    const el = videoRef.current;
    if (!el) return;
    const canPlay =
      mode === 'federated' ||
      (mode === 'local' && localState === 'ready' && !!hlsUrl);
    if (!canPlay || !el.paused) return;
    void el.play().catch(() => {
      el.muted = true;
      void el.play().catch(() => undefined);
    });
  }, [autoPlay, mode, localState, hlsUrl]);

  if (mode === 'federated') {
    return (
      <video
        ref={videoRef}
        src={attachment.url}
        poster={attachment.previewUrl ?? undefined}
        controls
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        className={className}
      />
    );
  }

  if (mode === 'local' && localState === 'ready' && hlsUrl) {
    return (
      <HlsVideo
        ref={videoRef}
        src={hlsUrl}
        poster={attachment.previewUrl ?? undefined}
        controls
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        className={className}
      />
    );
  }

  if (localState === 'error') {
    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center gap-3 rounded-md bg-black/50 p-6 text-center text-red-300 ${className}`}
      >
        <CircleAlert className="h-10 w-10" />
        <span>
          {t('posts.gallery.videoError', {
            defaultValue: 'This video could not be prepared for playback.',
          })}
        </span>
      </div>
    );
  }

  return (
    <div
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 rounded-md bg-black/50 p-6 text-center text-white ${className}`}
    >
      <LoaderCircle className="h-10 w-10 animate-spin" />
      <span>
        {t('posts.gallery.videoProcessing', {
          defaultValue: 'Preparing video…',
        })}
      </span>
    </div>
  );
}
