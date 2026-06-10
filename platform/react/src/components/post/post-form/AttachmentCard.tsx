import { useEffect, useRef } from 'react';
import { Play, X } from 'lucide-react';
import type { MediaAttachment, MediaAttachmentData } from '@openpeeps/common';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';

export interface ComposeItem {
  key: string;
  /** Local file pending upload; cleared once the server returns an attachment. */
  file?: File;
  usage: string;
  description?: string;
  /** Local blob preview shown during upload (images/videos). */
  previewUrl?: string;
  /** Server attachment once uploaded (carries `id`/`status` for processing). */
  attachment?: MediaAttachmentData;
  failed?: boolean;
  error?: string;
}

export interface AttachmentCardProps {
  item: ComposeItem;
  onUploaded: (key: string, attachment: MediaAttachment) => void;
  onProcessed: (key: string, attachment: MediaAttachmentData) => void;
  onFailed: (key: string, error?: string) => void;
  onRemove: (key: string) => void;
}

const PIE = { cx: 18, cy: 18, r: 16 } as const;

const piePath = (percent: number): string => {
  const p = Math.max(0, Math.min(100, percent));
  if (p <= 0) return '';
  const { cx, cy, r } = PIE;
  if (p >= 100) {
    return `M ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy} Z`;
  }
  const angle = (p / 100) * 2 * Math.PI;
  const endX = cx + r * Math.sin(angle);
  const endY = cy - r * Math.cos(angle);
  const largeArc = p > 50 ? 1 : 0;
  return `M ${cx},${cy} L ${cx},${cy - r} A ${r},${r} 0 ${largeArc},1 ${endX},${endY} Z`;
};

const formatRemaining = (ms: number): string => {
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

const attachmentId = (a?: MediaAttachmentData): string | undefined =>
  (a as MediaAttachment | undefined)?.id;

/**
 * A single post-composer attachment, mirroring the Svelte `AttachmentContainer`:
 * shows a pie overlay for the byte-upload phase, then for the server-side
 * processing phase (SSE), a failed state, and finally the preview with a
 * remove affordance.
 */
export function AttachmentCard({
  item,
  onUploaded,
  onProcessed,
  onFailed,
  onRemove,
}: AttachmentCardProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { state, upload, abort } = openpeepsApi.useMediaUpload();

  const att = item.attachment;
  const uploading = !!item.file && !att && !item.failed;
  const processing = !item.failed && att?.status === 'processing';
  const failed = !!item.failed;
  const showOverlay = uploading || processing;

  // --- Upload phase: run the byte transfer once, report up. -----------------
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || !item.file) return;
    startedRef.current = true;
    upload({
      file: item.file,
      usage: item.usage,
      description: item.description ?? item.file.name,
    })
      .then((attachment) => onUploaded(item.key, attachment))
      .catch((err) =>
        onFailed(item.key, err instanceof Error ? err.message : undefined),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.file]);

  // --- Processing phase: subscribe to the SSE feed while processing. --------
  const processingId = processing ? attachmentId(att) : undefined;
  const event = openpeepsApi.useMediaProgress(processingId);
  const reportedRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const data = event?.mediaAttachment;
    if (!data || !processingId) return;
    if (data.status === 'processing') return;
    if (reportedRef.current === processingId) return;
    reportedRef.current = processingId;
    if (data.status === 'failed') {
      onFailed(item.key, data.error);
    } else {
      onProcessed(item.key, { ...att, ...data, type: att?.type ?? data.type });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.mediaAttachment?.status, processingId]);

  const piePercent = uploading
    ? Math.max(0, Math.min(100, state.uploadPercent))
    : Math.min(95, Math.max(0, event?.progressPercent ?? 0));
  const etaMs = uploading
    ? state.uploadEstimatedRemainingMs
    : event?.estimatedRemainingMs;
  const phaseLabel = uploading
    ? t('form.upload.uploading', { defaultValue: 'Uploading' })
    : t('form.upload.processing', { defaultValue: 'Processing' });

  const remove = () => {
    abort();
    onRemove(item.key);
  };

  const previewUrl = item.previewUrl ?? att?.previewUrl ?? att?.url ?? '';
  const isImage =
    (att?.type ?? (item.file?.type.startsWith('image/') ? 'image' : '')) ===
    'image';
  const isVideo =
    (att?.type ?? (item.file?.type.startsWith('video/') ? 'video' : '')) ===
    'video';

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-md border">
      {!failed ? (
        <button
          type="button"
          title={t('posts.attachments.deleteTitle', {
            defaultValue: 'Delete attachment',
          })}
          onClick={remove}
          className="absolute right-1 top-1 z-20 rounded-full bg-background/80 p-1"
        >
          <X className="size-4" />
        </button>
      ) : null}

      {showOverlay ? (
        <div
          data-testid="attachment-progress"
          className="bg-surface-700 absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 text-white"
        >
          <svg
            viewBox="0 0 36 36"
            className="h-16 w-16"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(piePercent)}
          >
            <circle
              cx={PIE.cx}
              cy={PIE.cy}
              r={PIE.r}
              fill="rgba(255,255,255,0.25)"
            />
            {piePath(piePercent) ? (
              <path d={piePath(piePercent)} fill="white" />
            ) : null}
            <text
              x={PIE.cx}
              y={PIE.cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="8"
              fontWeight="600"
              fill="rgb(30 41 59)"
            >
              {Math.round(piePercent)}%
            </text>
          </svg>
          <span className="text-xs font-medium uppercase tracking-wide">
            {phaseLabel}
          </span>
          {etaMs !== undefined && etaMs > 1000 ? (
            <span className="text-xs opacity-80">~{formatRemaining(etaMs)}</span>
          ) : null}
        </div>
      ) : null}

      {failed ? (
        <div
          data-testid="attachment-failed"
          className="bg-error absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 text-white"
        >
          <span className="text-sm font-semibold">
            {t('posts.attachments.failed', { defaultValue: 'Upload failed' })}
          </span>
          <button
            type="button"
            onClick={remove}
            title={t('posts.attachments.deleteTitle', {
              defaultValue: 'Delete attachment',
            })}
            className="bg-surface-50 text-error-700 hover:bg-surface-200 rounded-full p-3"
          >
            <X className="size-8" />
          </button>
        </div>
      ) : null}

      {showOverlay || failed ? (
        <div className="bg-surface-200 h-full w-full" />
      ) : isImage || isVideo ? (
        <>
          <img
            src={previewUrl}
            alt={att?.description ?? ''}
            className="h-full w-full object-cover"
          />
          {isVideo ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-black/60">
                <Play className="size-5 text-white" />
              </span>
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center p-2">
          <p className="truncate text-xs">
            {att?.filename ?? item.file?.name ?? 'File'}
          </p>
        </div>
      )}
    </div>
  );
}
