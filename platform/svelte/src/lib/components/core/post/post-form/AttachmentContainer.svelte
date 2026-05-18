<script lang="ts">
  import type {
    MediaAttachment,
    MediaAttachmentData,
  } from '@openpeeps/common/types';
  import { Edit, X } from 'lucide-svelte';
  import { getModalManager, IconButton } from '@openpeeps/ui';
  import { ImageEditModal } from '$lib/components';
  import { DescriptionEditModal } from '$lib/components';
  import VideoPlayOverlay from '../VideoPlayOverlay.svelte';
  import { i18nContext } from '$lib/components/i18n';
  import DocumentAttachment from '../pieces/DocumentAttachment.svelte';
  import { activeMediaUploads, mediaProcessingProgress } from '$lib/api';
  import { formatRemainingDuration } from '$lib/utils';
  import { onDestroy } from 'svelte';

  const { t } = i18nContext();

  const modalManager = getModalManager();

  interface Props {
    attachment: MediaAttachmentData;
    handleDeleteAttachment?: () => void;
  }

  let { attachment, handleDeleteAttachment = () => {} }: Props = $props();

  const video = attachment.type === 'video';

  // `MediaAttachment` extends `MediaAttachmentData` with `id`/`status`. When
  // rendered in the post-form list we always have an id (either a placeholder
  // uuid emitted by `PostInputActions` or a real one returned by the server),
  // so this cast is safe in practice.
  const fullAttachment = $derived(attachment as MediaAttachment);

  const status = $derived(fullAttachment.status);

  const activeUpload = $derived(
    fullAttachment.id ? $activeMediaUploads.get(fullAttachment.id) : undefined,
  );

  // --- Upload phase (byte transfer) -----------------------------------------
  let uploadPercent = $state(0);
  let uploadEstimatedRemainingMs = $state<number | undefined>();
  $effect(() => {
    if (!activeUpload) {
      uploadPercent = 0;
      uploadEstimatedRemainingMs = undefined;
      return;
    }
    const unsubPercent = activeUpload.uploadPercent.subscribe((p) => {
      uploadPercent = p;
    });
    const unsubEta = activeUpload.uploadEstimatedRemainingMs.subscribe(
      (ms) => {
        uploadEstimatedRemainingMs = ms;
      },
    );
    return () => {
      unsubPercent();
      unsubEta();
    };
  });

  const isUploading = $derived(activeUpload !== undefined);
  const isProcessing = $derived(!isUploading && status === 'processing');
  const isFailed = $derived(status === 'failed');
  const showProgressOverlay = $derived(isUploading || isProcessing);
  const showEditButton = $derived(!showProgressOverlay && !isFailed);

  // --- Processing phase (server-side) ---------------------------------------
  // Subscribe to the SSE feed inline (rather than via a child component) so we
  // can render the progress as a single full-cover pie overlay alongside the
  // upload-phase progress.
  let processingPercent = $state(0);
  let processingEstimatedRemainingMs = $state<number | undefined>();
  // Plain (non-reactive) locals — assigning to a `$state` value inside the
  // effect that also reads it would schedule a re-run, fire the cleanup
  // (unsubscribe) and silently detach the subscriber from the SSE source.
  let processingStream: { stop: () => void } | undefined;
  let lastProcessingId: string | undefined;

  $effect(() => {
    const id = isProcessing ? fullAttachment.id : undefined;
    if (!id) {
      processingStream?.stop();
      processingStream = undefined;
      lastProcessingId = undefined;
      processingPercent = 0;
      processingEstimatedRemainingMs = undefined;
      return;
    }
    if (lastProcessingId === id) return;
    lastProcessingId = id;

    processingStream?.stop();
    const stream = mediaProcessingProgress(id);
    processingStream = stream;

    const unsubscribe = stream.subscribe((event: any) => {
      if (!event) return;
      processingEstimatedRemainingMs = event.estimatedRemainingMs;
      const sseStatus = event.mediaAttachment?.status;
      if (sseStatus === 'ready') {
        processingPercent = 100;
        Object.assign(attachment, event.mediaAttachment);
      } else if (sseStatus === 'failed') {
        processingPercent = 0;
        Object.assign(attachment as MediaAttachmentData, {
          status: 'failed',
          error: event.mediaAttachment?.error,
        });
      } else {
        processingPercent = Math.min(
          95,
          Math.max(0, event.progressPercent ?? 0),
        );
      }
    });

    return () => unsubscribe();
  });

  onDestroy(() => processingStream?.stop());

  // --- Pie + label derivations ----------------------------------------------
  const piePercent = $derived(
    isUploading
      ? Math.max(0, Math.min(100, uploadPercent))
      : processingPercent,
  );

  const phaseLabel = $derived(isUploading ? t('form.upload.uploading') : t('form.upload.processing'));

  const etaMs = $derived(
    isUploading ? uploadEstimatedRemainingMs : processingEstimatedRemainingMs,
  );

  // --- SVG pie geometry -----------------------------------------------------
  // Two concentric circles: a translucent track and a centered percentage
  // label. The progress is drawn as a clockwise filled wedge starting at 12
  // o'clock so the visual matches the colloquial "pie" mental model the user
  // asked for.
  const PIE = { cx: 18, cy: 18, r: 16 } as const;

  const piePath = $derived.by(() => {
    const p = piePercent;
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
  });

  const handleDelete = () => {
    activeUpload?.abort();
    handleDeleteAttachment();
  };

  const handleEditAttachment = () => {
    if (attachment.type === 'image') {
      modalManager.show(
        ImageEditModal,
        {
          attachment,
          showAltInput: true,
        },
        (newAttachment?: MediaAttachmentData) => {
          if (newAttachment) {
            Object.assign(attachment, newAttachment);
          }
        },
      );
    } else {
      modalManager.show(
        DescriptionEditModal,
        { attachment },
        (newAttachment?: MediaAttachmentData) => {
          if (newAttachment) {
            Object.assign(attachment, newAttachment);
          }
        },
      );
    }
  };

  const overlayButtonClass =
    'bg-surface-400 flex size-7 items-center justify-center rounded-md p-1';
</script>

<div class="relative mb-2 h-56 w-full overflow-hidden rounded-md">
  {#if !isFailed}
    <div class="absolute bottom-0 right-0 z-20 flex gap-3 p-2">
      {#if showEditButton}
        <IconButton
          title={t('common.actions.edit') + ' ' + 'Attachment'}
          action={handleEditAttachment}
          class={overlayButtonClass}
          icon={Edit}
        />
      {/if}
      <IconButton
        title={t('posts.attachments.deleteTitle')}
        action={handleDelete}
        class={overlayButtonClass}
        icon={X}
      />
    </div>
  {/if}

  {#if showProgressOverlay}
    <div
      class="bg-surface-700 absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-white"
      data-testid="attachment-progress"
    >
      <svg
        viewBox="0 0 36 36"
        class="h-20 w-20"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={Math.round(piePercent)}
      >
        <circle
          cx={PIE.cx}
          cy={PIE.cy}
          r={PIE.r}
          fill="rgba(255,255,255,0.25)"
        />
        {#if piePath}
          <path d={piePath} fill="white" />
        {/if}
        <text
          x={PIE.cx}
          y={PIE.cy + 1}
          text-anchor="middle"
          dominant-baseline="middle"
          font-size="8"
          font-weight="600"
          fill="rgb(30 41 59)"
        >
          {Math.round(piePercent)}%
        </text>
      </svg>
      <span class="text-xs font-medium uppercase tracking-wide">
        {phaseLabel}
      </span>
      {#if etaMs !== undefined && etaMs > 1000}
        <span class="text-xs opacity-80">
          ~{formatRemainingDuration(etaMs)}
        </span>
      {/if}
    </div>
  {/if}

  {#if isFailed}
    <div
      class="bg-error-500 absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 text-white"
      data-testid="attachment-failed"
    >
      <span class="text-sm font-semibold">
        {t('posts.attachments.failed')}
      </span>
      <button
        type="button"
        onclick={handleDelete}
        title={t('posts.attachments.deleteTitle')}
        class="bg-surface-50 text-error-700 hover:bg-surface-200 flex flex-col items-center gap-1 rounded-full p-4 transition-colors"
      >
        <X class="size-12" />
      </button>
      <span class="text-xs uppercase tracking-wide opacity-90">
        {t('common.actions.remove')}
      </span>
    </div>
  {/if}

  {#if showProgressOverlay || isFailed}
    <!-- While upload/processing is in flight (or after a terminal failure)
         the preview is intentionally hidden — the local blob URL would
         either be misleading (user expects the final processed asset) or,
         in the failed case, lie about the state. A neutral placeholder
         keeps the layout box stable beneath the overlay. -->
    <div class="bg-surface-200 h-full w-full rounded-md"></div>
  {:else if attachment.type === 'image' || attachment.type === 'video'}
    <img
      src={attachment.previewUrl}
      alt={attachment.description || 'image'}
      class="h-full w-full rounded-md object-contain"
      aria-hidden="true"
    />
    <VideoPlayOverlay {video} />
  {:else}
    <DocumentAttachment {attachment} />
  {/if}
</div>
