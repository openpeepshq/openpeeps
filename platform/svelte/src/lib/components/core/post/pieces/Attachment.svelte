<script lang="ts">
  import type { MediaAttachmentData, PublicPost } from '@openpeeps/common';
  import {
    getModalManager,
    preventDefault,
    stopPropagation,
  } from '@openpeeps/ui';
  import Gallery from './Gallery.svelte';
  import VideoPlayOverlay from '../VideoPlayOverlay.svelte';
  import DocumentAttachment from './DocumentAttachment.svelte';

  interface Props {
    attachment: MediaAttachmentData;
    index: number;
    post: PublicPost;
  }

  let { attachment, index, post }: Props = $props();

  const modalManager = getModalManager();

  const handleTriggerImageModal = (index: number) => {
    modalManager.show(Gallery, {
      attachments: post?.data?.attachments || [],
      currentIndex: index,
    });
  };

  let singleAttachment = $derived(post?.data?.attachments?.length === 1);
  const video = $derived(attachment?.type === 'video');
</script>

<button
  onclick={stopPropagation(
    preventDefault(() => handleTriggerImageModal(index)),
  )}
  title={attachment?.description || 'attachment'}
  class="relative w-full"
  class:h-full={!singleAttachment}
  class:overflow-hidden={!singleAttachment}
>
  {#if attachment.type === 'image' || attachment.type === 'video'}
    <img
      src={attachment.previewUrl}
      alt={attachment?.description || 'attachment'}
      class="size-full {singleAttachment ? 'object-contain' : 'object-cover'}"
    />

    <VideoPlayOverlay {video} />
  {:else}
    <DocumentAttachment {attachment} />
  {/if}
</button>
