<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import { me } from '$lib/api';
  import { getModalManager } from '@openpeeps/ui';
  import AddMemberModal from '$lib/components/core/groups/pieces/modals/AddMemberModal.svelte';
  import { checkGroupCapabilities } from '@openpeeps/common/lib';
  import { i18nContext } from '$lib/components/i18n';
  import { getCurrentAuthData } from '$lib/auth';

  const { t } = i18nContext();
  const modalManager = getModalManager();
  const authData = getCurrentAuthData();

  interface Props {
    group: GroupWithMeta | undefined;
  }

  let { group }: Props = $props();

  const action = () => {
    if (group) {
      modalManager.show(AddMemberModal, { group });
    }
  };
</script>

{#if group && checkGroupCapabilities(authData, ['core-groups-addMember'], group).success}
  <Button title={t('groups.actions.addMembers')} variant="variant-ringed-primary" {action}>
    {t('groups.actions.addMembers')}
  </Button>
{/if}
