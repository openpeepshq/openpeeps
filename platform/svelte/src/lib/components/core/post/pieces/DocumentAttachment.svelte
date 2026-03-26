<script lang="ts">
  import { formatSize, type MediaAttachmentData } from '@openpeeps/common';
  import { getFileIcon, getFileType } from '../helpers';
  import { FileQuestion } from 'lucide-svelte';

  interface Props {
    attachment: MediaAttachmentData;
  }

  let { attachment }: Props = $props();

  let fileType = $derived(getFileType(attachment));

  let Icon = $derived(
    attachment.type === 'document' ? getFileIcon(fileType) : FileQuestion,
  );
</script>

<div
  class="bg-surface-100 flex-start flex size-full flex-col items-start gap-3 rounded-lg p-4 text-start"
>
  <div
    class="bg-surface-400 flex size-10 items-center justify-center rounded-md p-1"
  >
    <Icon />
  </div>
  <p class="break-all text-base font-medium">
    {attachment.filename}
  </p>
  {#if attachment.description && attachment.description !== attachment.filename}
    <p class="text-muted-foreground text-sm">
      {attachment.description}
    </p>
  {/if}
  {#if attachment?.meta?.size}
    <span class="text-muted-foreground text-sm">
      {formatSize(attachment?.meta?.size || 0)}
    </span>
  {/if}
</div>
