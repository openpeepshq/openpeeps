<script lang="ts">
  import { PopupMenu, PopupMenuButton } from '@openpeeps/ui';
  import { MoreVertical } from 'lucide-svelte';
  import { i18nContext } from '@openpeeps/svelte/components';
  const { t } = i18nContext();
</script>

<PopupMenu icon={MoreVertical}>
  <PopupMenuButton
    title={t('navigation.myEvents')}
    text={t('navigation.myEvents')}
    action="/events/my"
  />
</PopupMenu>
