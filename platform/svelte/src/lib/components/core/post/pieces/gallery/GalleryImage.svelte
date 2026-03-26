<script lang="ts">
  import type { MediaAttachmentData } from '@openpeeps/common';

  interface Props {
    attachment: MediaAttachmentData;
  }

  let { attachment }: Props = $props();
</script>

<img
  src={attachment.url}
  class="rounded-container-token max-h-[90%] max-w-[90%] overflow-hidden shadow-xl"
  alt={attachment.description || 'attachment'}
  title={attachment.description || 'attachment'}
/>
