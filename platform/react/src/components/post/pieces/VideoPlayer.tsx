import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import type { MediaAttachmentData, MediaStream } from '@openpeeps/common';
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
 * Plays post-attachment videos through the server's HLS VOD endpoints, mirroring
 * the Svelte gallery `VideoPlayer`: same-origin (local) media is transcoded via
 * `createVodStream` + status polling and played as HLS; federated media falls
 * back to the source URL directly.
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
    // createVodStream/getVodStreamStatus are re-created each render; depend only
    // on the source URL so the flow runs once per attachment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.url]);

  // Attach the HLS stream once the playlist is ready (native HLS on Safari,
  // hls.js elsewhere).
  useEffect(() => {
    if (mode !== 'local' || localState !== 'ready' || !hlsUrl) return;
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
    video.src = hlsUrl;
    return;
  }, [mode, localState, hlsUrl]);

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

  if (mode === 'local' && localState === 'ready') {
    return (
      <video
        ref={videoRef}
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
