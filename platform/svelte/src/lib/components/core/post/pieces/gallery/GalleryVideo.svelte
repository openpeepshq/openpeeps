<script lang="ts">
  import { Download } from 'lucide-svelte';
  import type { MediaAttachmentData } from '@openpeeps/common';
  import { Button } from '@openpeeps/ui';
  import { downloadFile } from '$lib/utils';
  import { i18nContext } from '$lib/components/i18n';
  import VideoPlayer from './VideoPlayer.svelte';

  const { t } = i18nContext();

  interface Props {
    attachment: MediaAttachmentData;
  }

  let { attachment }: Props = $props();
</script>

<div class="relative h-3/4 w-3/4 min-h-0 max-h-[75vh] max-w-[75vw] overflow-hidden">
  <VideoPlayer {attachment} class="size-full max-h-full min-h-0" />
  <Button
    class="absolute left-4 top-4 z-50"
    variant="variant-filled-primary"
    action={() => downloadFile(attachment.url, attachment.filename)}
  >
    <Download class="size-4" />
    <span class="text-sm">{t('common.actions.download')}</span>
  </Button>
</div>
