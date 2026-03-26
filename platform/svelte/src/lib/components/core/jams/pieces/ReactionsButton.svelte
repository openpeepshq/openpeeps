<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import { Laugh } from 'lucide-svelte';
  import { getPopupMenuContext } from '../context';

  const popupMenuContext: any = getPopupMenuContext();
  const toggleEmoji = () =>
    $popupMenuContext !== 'emoji'
      ? popupMenuContext.set('emoji')
      : popupMenuContext.set(undefined);
</script>

<Button
  title="Send a reaction"
  variant={$popupMenuContext === 'emoji'
    ? 'variant-soft-primary'
    : 'variant-soft-surface'}
  class="size-10 p-2"
  action={toggleEmoji}
>
  <Laugh />
</Button>
