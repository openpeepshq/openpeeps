<script lang="ts">
  import type { MediaAttachmentData } from '@openpeeps/common';
  import { getModalManager } from '@openpeeps/ui';
  import GalleryImage from './gallery/GalleryImage.svelte';
  import GalleryVideo from './gallery/GalleryVideo.svelte';
  import GalleryAudio from './gallery/GalleryAudio.svelte';
  import GalleryDocument from './gallery/GalleryDocument.svelte';

  interface Props {
    attachments: MediaAttachmentData[];
    currentIndex: number;
  }

  let { attachments, currentIndex }: Props = $props();

  const modalManager = getModalManager();

  const handleNext = () => {
    if (currentIndex != attachments.length - 1) {
      currentIndex++;
    } else {
      currentIndex = 0;
    }
  };

  const handlePrevious = () => {
    if (currentIndex != 0) {
      currentIndex--;
    } else {
      currentIndex = attachments.length - 1;
    }
  };
  const cButton =
    'absolute top-1/2 transform -translate-y-1/2 z-50 font-bold shadow-xl p-4 outline-none rounded-md';
  let attachment = $derived(attachments[currentIndex]);
</script>

<div
  class="fixed left-0 top-0 flex h-screen w-screen items-center justify-center"
>
  <!-- Left arrow -->
  {#if attachments.length > 1}
    <button
      title="Previous"
      class="{cButton} bg-surface-50/15 active:bg-surface-50 left-0 md:left-4"
      onclick={handlePrevious}>←</button
    >
  {/if}

  <!-- Image -->
  {#if attachment.type === 'video'}
    <GalleryVideo {attachment} />
  {:else if attachment.type === 'audio'}
    <GalleryAudio {attachment} />
  {:else if attachment.type === 'image'}
    <GalleryImage {attachment} />
  {:else}
    <GalleryDocument {attachment} />
  {/if}

  <!-- Right arrow -->
  {#if attachments.length > 1}
    <button
      title="Next"
      class="{cButton} bg-surface-50/15 active:bg-surface-50 right-0 md:right-4"
      onclick={handleNext}>→</button
    >
  {/if}

  <!-- Close button -->
  <button
    title="Close"
    class="btn-icon variant-filled fixed right-4 top-4 z-50 font-bold shadow-xl"
    onclick={modalManager.close}>×</button
  >
</div>
