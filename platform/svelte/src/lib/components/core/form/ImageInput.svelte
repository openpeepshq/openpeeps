<script lang="ts">
  import { Camera, Image, Loader2, X } from 'lucide-svelte';
  import { getModalManager } from '@openpeeps/ui';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { ImageEditModal } from '.';
  import MediaUploadProgress from './MediaUploadProgress.svelte';
  import type { MediaAttachment } from '@openpeeps/common/types';
  import { uuidv7 } from 'uuidv7';
  import { uploadMediaWithProgress } from '$lib/api';
  import { hasValue } from '@openpeeps/common/lib';
  import { i18nContext } from '$lib/components/i18n';
  import { convertToWebpIfHeic, toast } from '$lib/utils';
  import { onDestroy } from 'svelte';

  const { t } = i18nContext();
  const modalManager = getModalManager();
  const toastStore = getToastStore();
  let previewUrl = $state('');
  let isLoading = $state(false);
  let uploadController: { abort: () => void } | undefined = $state();
  let uploadPercent = $state(0);
  let uploadEstimatedRemainingMs = $state<number | undefined>(undefined);
  let isUploading = $state(false);
  let pendingMediaId = $state<string | undefined>(undefined);

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
    displayType?: 'full' | 'avatar' | 'button';
    classes?: string;
    text?: string;
    aspectRatio?: string;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    maxSizeKb?: number;
    targetDimensions?: { width: number; height: number } | undefined;
    showAltInput?: boolean;
    showSelectAspectRatio?: boolean;
    specsText?: string;
    onchange: (attachment: MediaAttachment) => void;
    showFullImage?: boolean;
    title?: string;
  }

  let {
    usage,
    description = '',
    url = undefined,
    displayType = 'full',
    classes = '',
    text = t('form.imageInput.uploadText'),
    aspectRatio = undefined,
    minWidth = 0,
    minHeight = 0,
    maxWidth = Number.MAX_SAFE_INTEGER,
    maxHeight = Number.MAX_SAFE_INTEGER,
    maxSizeKb = 512,
    targetDimensions = undefined,
    showAltInput = false,
    showSelectAspectRatio = false,
    specsText = '',
    onchange,
    showFullImage = false,
    title = t('form.imageInput.uploadTitle'),
  }: Props = $props();

  	let backgroundStyle = $state('');


  if (!specsText) {
    specsText = [
      minWidth && t('form.imageInput.minWidth', { width: minWidth }),
      minHeight && t('form.imageInput.minHeight', { height: minHeight }),
      aspectRatio && t('form.imageInput.aspectRatio', { ratio: aspectRatio }),
      maxSizeKb && t('form.imageInput.maxSize', { size: maxSizeKb }),
    ]
      .filter(Boolean)
      .join(', ');
  }

  let fileInput: HTMLInputElement | undefined = $state();

  const defaultClasses = {
    full: 'h-52 w-full relative border-dashed border',
    avatar: 'size-24 flex items-center justify-center',
    button: '',
  };

  const defaultAttachment = (
    url: string,
    filename: string,
  ): MediaAttachment => ({
    id: uuidv7(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    description,
    url,
    type: 'image',
    previewUrl: url,
    filename,
    textUrl: null,
    meta: {
      usage,
    },
  });

  const onFileSelected = async () => {
    const file = fileInput?.files?.[0];

		if (!file) {
			return
		}

		const processedFile = await convertToWebpIfHeic(file)

		isLoading = true;
		if (file && file.type.includes('image')) {

			const reader = new FileReader();
			reader.addEventListener('load', () => {
				const url = reader.result as string;
				modalManager.show(
					ImageEditModal,
					{
						attachment: defaultAttachment(url, processedFile.name),
						aspectRatio,
						minHeight,
						minWidth,
						maxHeight,
						maxWidth,
						maxSizeKb,
						showAltInput,
						showSelectAspectRatio,
						targetDimensions:
							displayType === 'avatar' ? { width: 150, height: 150 } : targetDimensions,
						cropShape: displayType === 'avatar' ? 'round' : 'rect'
					},
					(attachment?: MediaAttachment) => {
						if (attachment) {
							previewUrl = attachment.url;
							onchange(attachment);
						}
					}
				);
			});
			reader.readAsDataURL(processedFile);
		} else if (file && (file.type.includes('video') || file.name.endsWith('.mkv'))) {
      uploadPercent = 0;
      isUploading = true;
      pendingMediaId = undefined;
      const handle = uploadMediaWithProgress({
        file,
        description,
        usage: 'post-video',
      });
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
      }
		}
		isLoading = false;
	};

  const onMediaReady = (attachment: MediaAttachment) => {
    pendingMediaId = undefined;
    onchange(attachment);
  };

  const onMediaFailed = (error?: string) => {
    showUploadFailedToast(error);
    resetUploadState();
  };
	$effect(() => {
		const updatedStyle = previewUrl
			? `background-image: url(${previewUrl})`
			: `background-image: url(${url})`;
		backgroundStyle = updatedStyle;
	});

  const iconClass =
    'flex size-10 items-center justify-center rounded-full bg-surface-200 opacity-50';

  onDestroy(() => {
    uploadController?.abort();
  });
</script>

<button {title} class="{defaultClasses[displayType]} relative {classes}">
  <span class="flex size-full items-center">
    <span
      class="flex size-full flex-col items-center justify-center bg-center bg-no-repeat"
      class:bg-surface-200={displayType === 'full' && !url}
      class:bg-surface-300={displayType === 'avatar' && !url}
      class:rounded-full={displayType === 'avatar'}
      class:bg-cover={!showFullImage}
      style={backgroundStyle}
    >
      {#if displayType === 'full'}
        {#if !hasValue(url || previewUrl)}
          <Camera />
          <span class="font-bold">{text}</span>
          <span class="text-sm">{specsText}</span>
        {:else}
          <span class="flex items-center gap-4">
            <span class={iconClass}>
              <Camera />
            </span>
            <span class={iconClass}>
              <X />
            </span>
          </span>
        {/if}
      {:else if displayType === 'button' || (displayType === 'avatar' && !url)}
        <Image />
      {/if}
      {#if displayType === 'avatar'}
        <span
          class="bg-surface-200 absolute bottom-0 right-0 flex size-10 items-center justify-center rounded-full"
          class:opacity-80={url}
        >
          <Camera size={20} />
        </span>
      {/if}
    </span>
    {#if isLoading && !isUploading && !pendingMediaId}
      <Loader2 class="ml-2 h-8 w-8 animate-spin" />
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
    accept="image/*, video/*,.mkv"
    bind:this={fileInput}
    onchange={onFileSelected}
    class="absolute left-0 top-0 size-full cursor-pointer opacity-0"
    disabled={isLoading}
  />
</button>
