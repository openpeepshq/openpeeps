<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import { Laugh } from 'lucide-svelte';
  import { getPopupMenuContext } from '../context';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();
  const popupMenuContext: any = getPopupMenuContext();
  const toggleEmoji = () =>
    $popupMenuContext !== 'emoji'
      ? popupMenuContext.set('emoji')
      : popupMenuContext.set(undefined);
</script>

<Button
  title={t('jams.reactions.sendTitle')}
  variant={$popupMenuContext === 'emoji'
    ? 'variant-soft-primary'
    : 'variant-soft-surface'}
  class="size-10 p-2"
  action={toggleEmoji}
>
  <Laugh />
</Button>
