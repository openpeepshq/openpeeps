<script lang="ts">
  // import { Button } from '@openpeeps/ui';
  // import { Smile } from 'lucide-svelte';
  import { Image, Paperclip } from 'lucide-svelte';
  import { getModalManager } from '@openpeeps/ui';
  import { getToastStore } from '@skeletonlabs/skeleton';
  import {
    ImageEditModal,
    type ImageEditCropResult,
  } from '$lib/components';
  import { startTrackedUpload } from '$lib/api';
  import type {
    MediaAttachment,
    MediaAttachmentData,
    PostDataUnion,
  } from '@openpeeps/common/types';
  import { uuidv7 } from 'uuidv7';
  import { i18nContext } from '@openpeeps/svelte/components/i18n';
  import { convertToWebpIfHeic, toast } from '$lib/utils';

  interface Props {
    postData: PostDataUnion;
  }

  let { postData = $bindable() }: Props = $props();
  const { t } = i18nContext();
  const modalManager = getModalManager();
  const toastStore = getToastStore();

  let imageInput: HTMLInputElement | undefined = $state();
  let documentInput: HTMLInputElement | undefined = $state();

  const showFailedToast = (reason?: string) => {
    toastStore.trigger(
      toast({
        message: reason
          ? t('form.upload.failedWithReason', { reason })
          : t('form.upload.failed'),
        background: 'variant-filled-error',
      }),
    );
  };

  const buildPlaceholder = (
    file: { name: string; type: string; size: number },
    type: 'image' | 'video' | 'document' | 'audio',
    usage: string,
    localUrl: string,
    description?: string,
  ): MediaAttachment => ({
    id: uuidv7(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    type,
    url: localUrl,
    previewUrl: localUrl,
    textUrl: null,
    filename: file.name,
    description: description ?? '',
    meta: {
      usage,
      mimetype: file.type,
      size: file.size,
    },
    status: 'processing',
  });

  // Push the placeholder into the attachment list immediately so the user gets
  // visual feedback, then patch the same array slot when the server responds.
  // We always mutate through `postData.attachments[idx]` (the Svelte 5 `$state`
  // proxy) — writing to the local `placeholder` reference bypasses the proxy
  // and silently breaks reactivity (the SSE subscription never sees the id
  // flip from placeholder → real, etc.).
  const orchestrate = (
    placeholder: MediaAttachment,
    file: File,
    description: string | undefined,
    usage: string,
  ) => {
    if (!postData.attachments) {
      postData.attachments = [];
    }
    const placeholderId = placeholder.id;
    postData.attachments.push(placeholder);

    const findIndex = () =>
      postData.attachments?.findIndex(
        (a) => (a as MediaAttachment).id === placeholderId,
      ) ?? -1;

    startTrackedUpload(
      placeholderId,
      { file, description, usage },
      {
        onResolved: (real) => {
          const idx = findIndex();
          if (idx >= 0 && postData.attachments) {
            postData.attachments[idx] = real;
          }
        },
        onFailed: (reason) => {
          const idx = findIndex();
          if (idx >= 0 && postData.attachments) {
            postData.attachments[idx] = {
              ...(postData.attachments[idx] as MediaAttachmentData),
              status: 'failed',
              error: reason,
            };
          }
          showFailedToast(reason);
        },
      },
    );
  };

  const onImageInputChange = async () => {
    const file = imageInput?.files?.[0];
    if (!file) return;
    const processed = await convertToWebpIfHeic(file);

    if (processed.type.includes('image')) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const dataUrl = reader.result as string;
        modalManager.show(
          ImageEditModal,
          {
            attachment: {
              type: 'image',
              url: dataUrl,
              previewUrl: dataUrl,
              textUrl: null,
              filename: processed.name,
              description: '',
              meta: { usage: 'post-image' },
            },
            showAltInput: true,
            showSelectAspectRatio: true,
            upload: false,
          },
          (result?: MediaAttachmentData | ImageEditCropResult) => {
            if (!result || !('file' in result)) return;
            const cropResult = result as ImageEditCropResult;
            const blob = cropResult.file;
            const blobUrl = URL.createObjectURL(blob);
            const blobAsFile =
              blob instanceof File
                ? blob
                : new File([blob], processed.name, { type: blob.type });
            const placeholder = buildPlaceholder(
              blobAsFile,
              'image',
              'post-image',
              blobUrl,
              cropResult.description,
            );
            orchestrate(
              placeholder,
              blobAsFile,
              cropResult.description,
              'post-image',
            );
          },
        );
      });
      reader.readAsDataURL(processed);
    } else if (
      file.type.includes('video') ||
      file.name.endsWith('.mkv')
    ) {
      const blobUrl = URL.createObjectURL(file);
      const placeholder = buildPlaceholder(
        file,
        'video',
        'post-video',
        blobUrl,
      );
      orchestrate(placeholder, file, undefined, 'post-video');
    }

    if (imageInput) imageInput.value = '';
  };

  const onDocumentInputChange = () => {
    const file = documentInput?.files?.[0];
    if (!file) return;
    const blobUrl = URL.createObjectURL(file);
    const placeholder = buildPlaceholder(
      file,
      'document',
      'post-document',
      blobUrl,
      file.name,
    );
    orchestrate(placeholder, file, file.name, 'post-document');
    if (documentInput) documentInput.value = '';
  };
</script>

<div class="flex items-center gap-x-2 md:gap-x-3">
  <!-- <Button title="Add Emoji" class=" btn-icon-sm cursor-not-allowed">
		<Smile class="text-surface-400" />
	</Button> -->
  <!-- AudioInput intentionally disabled (parity with previous PostInputActions). -->
  <button
    type="button"
    title={t('posts.form.addImage')}
    onclick={() => imageInput?.click()}
    class="flex items-center justify-center"
  >
    <Image />
  </button>
  <button
    type="button"
    title={t('posts.form.addDocument')}
    onclick={() => documentInput?.click()}
    class="flex items-center justify-center"
  >
    <Paperclip />
  </button>
</div>

<input
  type="file"
  accept="image/*, video/*,.mkv"
  bind:this={imageInput}
  onchange={onImageInputChange}
  class="hidden"
/>
<input
  type="file"
  accept=".pdf,.doc,.docx,.odt,.txt,.md,.xls,.xlsx,.ods,.csv,.key,.numbers,.ppt,.pptx,application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.oasis.opendocument.text, text/plain, text/markdown, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv, application/vnd.oasis.opendocument.spreadsheet, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation, application/vnd.oasis.opendocument.presentation, application/vnd.apple.numbers, application/vnd.apple.keynote, .pages, application/vnd.apple.pages"
  bind:this={documentInput}
  onchange={onDocumentInputChange}
  class="hidden"
/>
