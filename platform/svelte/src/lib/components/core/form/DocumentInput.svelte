<script lang="ts">
  import { Paperclip } from 'lucide-svelte';
  import { onDestroy } from 'svelte';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import type { MediaAttachment } from '@openpeeps/common/types';
  import { LoadingIcon } from '@openpeeps/ui';
  import { uploadMediaWithProgress } from '$lib/api';
  import { toast } from '$lib/utils';
  import MediaUploadProgress from './MediaUploadProgress.svelte';
  import { i18nContext } from '$lib/components/i18n';

  let backgroundStyle = $state('');
  let isLoading = $state(false);
  let uploadPercent = $state(0);
  let uploadEstimatedRemainingMs = $state<number | undefined>(undefined);
  let isUploading = $state(false);
  let pendingMediaId = $state<string | undefined>(undefined);
  const { t } = i18nContext();
  const toastStore = getToastStore();

  const showUploadFailedToast = (reason?: string) => {
    toastStore.trigger(
      toast({
        message: reason
          ? t('form.upload.failedWithReason', { reason })
          : t('form.upload.failed'),
        background: 'variant-filled-error',
      }),
    );
  };

  const resetUploadState = () => {
    pendingMediaId = undefined;
    isUploading = false;
    uploadPercent = 0;
    uploadEstimatedRemainingMs = undefined;
    isLoading = false;
  };

  interface Props {
    usage: string;
    description?: string;
    url?: string;
    displayType?: 'button';
    classes?: string;
    onchange: (attachment: MediaAttachment) => void;
    title?: string;
  }

  let {
    usage,
    description = '',
    displayType = 'button',
    classes = '',
    onchange,
    title = t('form.documentInput.uploadTitle'),
  }: Props = $props();

  let fileInput: HTMLInputElement | undefined = $state();
  let uploadController: { abort: () => void } | undefined = $state();

  const defaultClasses = {
    full: 'h-52 w-full relative border-dashed border',
    avatar: 'size-24 flex items-center justify-center',
    button: '',
  };

  const onFileSelected = async () => {
    const file = fileInput?.files?.[0];

    if (!file) {
      return;
    }

    uploadController?.abort();
    uploadPercent = 0;
    isUploading = true;
    pendingMediaId = undefined;
    isLoading = true;

    description = description || file.name;
    const handle = uploadMediaWithProgress({ file, description, usage });
    uploadController = { abort: handle.abort };
    const unsubscribePercent = handle.uploadPercent.subscribe((p) => {
      uploadPercent = p;
    });
    const unsubscribeEta = handle.uploadEstimatedRemainingMs.subscribe(
      (ms) => {
        uploadEstimatedRemainingMs = ms;
      },
    );
    const unsubscribeAttachment = handle.attachment.subscribe((a) => {
      if (a) {
        pendingMediaId = a.id;
        isUploading = false;
        if (a.status === 'ready') {
          onchange(a);
        }
      }
    });

    try {
      await handle.promise;
      if (fileInput) {
        fileInput.value = '';
      }
      description = '';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // user-initiated, no toast
      } else {
        showUploadFailedToast(error instanceof Error ? error.message : undefined);
        resetUploadState();
      }
    } finally {
      uploadController = undefined;
      unsubscribePercent();
      unsubscribeEta();
      unsubscribeAttachment();
      isLoading = false;
    }
  };

  const onMediaReady = (attachment: MediaAttachment) => {
    pendingMediaId = undefined;
    onchange(attachment);
  };

  const onMediaFailed = (error?: string) => {
    showUploadFailedToast(error);
    resetUploadState();
  };

  onDestroy(() => {
    uploadController?.abort();
  });
</script>

<button {title} class="{defaultClasses[displayType]} relative {classes}">
  <span class="flex size-full items-center">
    <span
      class="flex size-full flex-col items-center justify-center bg-cover"
      style={backgroundStyle}
    >
      <Paperclip />
    </span>
    {#if isLoading && !isUploading && !pendingMediaId}
      <LoadingIcon />
    {/if}
  </span>
  {#if isUploading || pendingMediaId}
    <div class="absolute bottom-0 left-0 right-0 p-2 bg-surface-100/90">
      <MediaUploadProgress
        {uploadPercent}
        {uploadEstimatedRemainingMs}
        {isUploading}
        mediaAttachmentId={pendingMediaId}
        onReady={onMediaReady}
        onFailed={onMediaFailed}
      />
    </div>
  {/if}
  <input
    type="file"
    accept=".pdf,.doc,.docx,.odt,.txt,.md,.xls,.xlsx,.ods,.csv,.key,.numbers,.ppt,.pptx,application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.oasis.opendocument.text, text/plain, text/markdown, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv, application/vnd.oasis.opendocument.spreadsheet, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation, application/vnd.oasis.opendocument.presentation, application/vnd.apple.numbers, application/vnd.apple.keynote, .pages, application/vnd.apple.pages"
    bind:this={fileInput}
    onchange={onFileSelected}
    class="absolute left-0 top-0 size-full cursor-pointer opacity-0"
    disabled={isLoading}
  />
</button>
