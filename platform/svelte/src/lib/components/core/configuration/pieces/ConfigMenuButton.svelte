<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import { ChevronRight } from 'lucide-svelte';
  import { i18nContext } from '$lib/components/i18n';

  interface Props {
    translationPrefix: string;
    action: string;
  }

  const { translationPrefix, action }: Props = $props();
  const { t } = i18nContext();
</script>

<Button
  class="hover:bg-surface-100 flex w-full items-center justify-between px-4 py-3 text-start"
  {action}
>
  <div>
    <div class="font-medium">{t(`${translationPrefix}.title`)}</div>
    <div class="text-surface-500 text-xs">
      {t(`${translationPrefix}.description`)}
    </div>
  </div>
  <span aria-hidden="true"><ChevronRight class="h-4 w-4" /></span>
</Button>
