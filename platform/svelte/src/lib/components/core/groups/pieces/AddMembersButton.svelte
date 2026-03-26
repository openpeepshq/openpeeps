<script lang="ts">
  import { Button } from '@openpeeps/ui';
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import { me } from '$lib/api';
  import { getModalManager } from '@openpeeps/ui';
  import AddMemberModal from '$lib/components/core/groups/pieces/modals/AddMemberModal.svelte';
  import { checkGroupCapabilities } from '@openpeeps/common/lib';

  const modalManager = getModalManager();

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

{#if group && checkGroupCapabilities(['core-groups-addMember'], $me, group).success}
  <Button title="Add Members" variant="variant-ringed-primary" {action}>
    Add Members
  </Button>
{/if}
