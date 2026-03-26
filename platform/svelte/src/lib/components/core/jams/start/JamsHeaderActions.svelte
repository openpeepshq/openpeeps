<script lang="ts">
  import { PopupMenuButton, PopupMenu } from '@openpeeps/ui';
  import { EllipsisVertical } from 'lucide-svelte';
  import { i18nContext } from '@openpeeps/svelte/components';

  const { t } = i18nContext();
</script>

<PopupMenu icon={EllipsisVertical}>
  <PopupMenuButton
    title={t('navigation.myJams')}
    text={t('navigation.myJams')}
    action="/jams/my"
  />
</PopupMenu>
