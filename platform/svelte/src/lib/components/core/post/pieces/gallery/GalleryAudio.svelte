<script lang="ts">
  import type { MediaAttachmentData } from '@openpeeps/common';

  interface Props {
    attachment: MediaAttachmentData;
  }

  let { attachment }: Props = $props();
</script>

<div
  class="flex h-full w-full flex-grow items-center justify-center bg-center bg-no-repeat"
  style="background-image: url({attachment.previewUrl})"
>
  <audio controls src={attachment.url} autoplay>
    <track kind="captions" />
  </audio>
</div>
