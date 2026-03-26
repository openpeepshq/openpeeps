<script lang="ts">
  import type { MediaAttachmentData } from '@openpeeps/common';

  interface Props {
    attachment: MediaAttachmentData;
  }

  let { attachment }: Props = $props();
</script>

<video controls src={attachment.url} class="h-3/4 w-3/4" autoplay>
  <track kind="captions" />
</video>
