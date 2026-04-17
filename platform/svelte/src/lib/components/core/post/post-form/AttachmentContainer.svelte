<script lang="ts">
  import type { MediaAttachmentData } from '@openpeeps/common/types';
  import { Edit, X } from 'lucide-svelte';
  import { getModalManager, IconButton } from '@openpeeps/ui';
  import { ImageEditModal } from '$lib/components';
  import { DescriptionEditModal } from '$lib/components';
  import VideoPlayOverlay from '../VideoPlayOverlay.svelte';
  import { i18nContext } from '$lib/components/i18n';
  import DocumentAttachment from '../pieces/DocumentAttachment.svelte';

  const { t } = i18nContext();

  const modalManager = getModalManager();

  interface Props {
    attachment: MediaAttachmentData;
    handleDeleteAttachment?: () => void;
  }

  let { attachment, handleDeleteAttachment = () => {} }: Props = $props();

  const video = attachment.type === 'video';

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

<div class="relative mb-2 h-56 w-full overflow-hidden">
  <div class="absolute bottom-0 right-0 z-10 flex gap-3 p-2">
    <IconButton
      title={t('common.actions.edit') + ' ' + 'Attachment'}
      action={handleEditAttachment}
      class={overlayButtonClass}
      icon={Edit}
    />
    <IconButton
      title={t('posts.attachments.deleteTitle')}
      action={handleDeleteAttachment}
      class={overlayButtonClass}
      icon={X}
    />
  </div>
  {#if attachment.type === 'image' || attachment.type === 'video'}
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
