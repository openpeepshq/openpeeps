<script lang="ts">
  import { Paperclip } from 'lucide-svelte';
  import { onDestroy } from 'svelte';
  import type { MediaAttachment } from '@openpeeps/common/types';
  import { LoadingIcon } from '@openpeeps/ui';
  import { uploadMediaFileMutation } from '$lib/api';
  import { i18nContext } from '$lib/components/i18n';
  import { toaster, withSlowUploadNotice } from '$lib/utils/toast';

  const uploadMediaFile = uploadMediaFileMutation();
  const toastNotify = toaster();
  let backgroundStyle = $state('');
  let isLoading = $state(false);
  const { t } = i18nContext();

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
  let uploadController: AbortController | undefined = $state();

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
    uploadController = new AbortController();
    isLoading = true;

    try {
      description = description || file.name;
      await withSlowUploadNotice(toastNotify, t, () =>
        uploadMediaFile(
        { file, description, usage },
        undefined,
        undefined,
        undefined,
        uploadController?.signal,
      ).then(onchange)
      );
      if (fileInput) {
        fileInput.value = '';
      }
      description = '';
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) {
        throw error;
      }
    } finally {
      uploadController = undefined;
      isLoading = false;
    }
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
    {#if isLoading}
      <LoadingIcon />
    {/if}
  </span>
  <input
    type="file"
    accept=".pdf,.doc,.docx,.odt,.txt,.md,.xls,.xlsx,.ods,.csv,.key,.numbers,.ppt,.pptx,application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.oasis.opendocument.text, text/plain, text/markdown, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv, application/vnd.oasis.opendocument.spreadsheet, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation, application/vnd.oasis.opendocument.presentation, application/vnd.apple.numbers, application/vnd.apple.keynote, .pages, application/vnd.apple.pages"
    bind:this={fileInput}
    onchange={onFileSelected}
    class="absolute left-0 top-0 size-full cursor-pointer opacity-0"
    disabled={isLoading}
  />
</button>
