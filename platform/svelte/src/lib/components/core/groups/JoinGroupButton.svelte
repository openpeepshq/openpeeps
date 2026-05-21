<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button } from '@openpeeps/ui';
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import { joinGroupMutation } from '$lib/api';
  import { checkGroupCapabilities } from '@openpeeps/common';
  import { i18nContext } from '@openpeeps/svelte/components';
  import { getCurrentAuthData } from '$lib/auth';

  const authData = getCurrentAuthData();
  interface Props {
    group: GroupWithMeta;
  }

  let { group }: Props = $props();

  const { t } = i18nContext();
  const joinGroup = joinGroupMutation({ id: group.id });

  let joined = $state(false);

  let canJoin = $derived(
    checkGroupCapabilities(authData, ['core-groups-join'], group).success &&
      !joined,
  );

  const action = () =>
    joinGroup()
      .then(() => (joined = true))
      .then(() => goto(`/groups/@${group.handle}`));
</script>

{#if canJoin}
  <Button
    title={t('groups.join.submit')}
    variant="variant-ringed-primary"
    {action}
  >
    {t('groups.join.submit')}
  </Button>
{/if}
