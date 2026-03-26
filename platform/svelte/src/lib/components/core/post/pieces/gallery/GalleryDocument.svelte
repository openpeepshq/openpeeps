<script lang="ts">
  import { Download } from 'lucide-svelte';
  import type { MediaAttachmentData } from '@openpeeps/common';
  import { Button } from '@openpeeps/ui';
  import { downloadFile } from '$lib/utils';
  import DocumentAttachment from '../DocumentAttachment.svelte';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();

  interface Props {
    attachment: MediaAttachmentData;
  }

  let { attachment }: Props = $props();
</script>

<div class="flex size-full items-center justify-center p-4">
  <div class="md:w-128 relative flex h-96 w-full flex-col">
    <DocumentAttachment {attachment} />
    <Button
      class="absolute bottom-4 right-4"
      variant="variant-filled-primary"
      action={() => downloadFile(attachment.url, attachment.filename)}
    >
      <Download class="size-4" />
      <span class="text-sm">{t('common.actions.download')}</span>
    </Button>
  </div>
</div>
