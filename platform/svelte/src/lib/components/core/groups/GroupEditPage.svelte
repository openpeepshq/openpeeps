<script lang="ts">
  // @ts-nocheck
  import { groupDataSchema, type GroupWithMeta } from '@openpeeps/common/types';
  import { toaster } from '$lib/utils/toast';
  import { updateGroupMutation } from '$lib/api';
  import { getPageHeaderStore } from '$lib/stores';
  import { presetProps } from '$lib/utils/componentUtils';
  import { GroupForm, UpdateGroupButton } from '.';
  import { goto } from '$app/navigation';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();

  interface Props {
    group: GroupWithMeta;
  }

  let { group }: Props = $props();
  const updateGroup = updateGroupMutation();
  const toast = toaster();

  let groupData = $state(groupDataSchema.parse(group));

  const handleSubmit = () =>
    updateGroup(groupData, { id: group.id })
      .then((group) => {
        toast({
          message: `Group updated successfully`,
        }),
          goto(`/groups/@${group.handle}`);
      })
      .catch((error) =>
        toast({
          message: t(error.message),
          type: 'error',
        }),
      )
      .finally(() => undefined);

  getPageHeaderStore().set({
    title: 'Update group',
    actions: presetProps(UpdateGroupButton, { handleSubmit }),
  });
</script>

<div class="pb-10">
  <GroupForm bind:groupData />
</div>
