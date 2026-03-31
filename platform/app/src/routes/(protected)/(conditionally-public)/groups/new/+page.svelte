<script lang="ts">
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { ProfileSelector } from '@openpeeps/svelte/components';
  import { type GroupData, type PublicProfile } from '@openpeeps/common/types';
  import { CreateGroupButton } from '@openpeeps/svelte/components';
  import { Label } from '@openpeeps/ui';
  import { GroupForm } from '@openpeeps/svelte/components';
  import { presetProps } from '@openpeeps/svelte/utils';
  import { createGroupMutation } from '@openpeeps/svelte/api';
  import { goto } from '$app/navigation';
  import type { Component } from 'svelte';
  import { toaster } from '@openpeeps/svelte/utils';
  import { i18nContext } from '@openpeeps/svelte/components';
  import { groupCapabilityTemplates } from '@openpeeps/common/lib';
  import { getServerInfo } from '@openpeeps/svelte/server';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';

  const { t } = i18nContext();
  const toast = toaster();
  const me = getCurrentProfile();

  const { publicContent } = getServerInfo();

  const createGroup = createGroupMutation();

  let selectedMembersProfiles: PublicProfile[] = $state([]);

  let groupData: GroupData = $state({
    displayName: '',
    handle: '',
    description: '',
    rules: '',
    capabilities: publicContent
      ? groupCapabilityTemplates.defaultGroup.capabilities
      : groupCapabilityTemplates.defaultGroupClosedCommunity.capabilities,
  });

  const handleSubmit = async () => {
    if (groupData.handle.length === 0) {
      if (!groupData.displayName) {
        toast({ message: t('handle.validation.error'), type: 'error' });
        return;
      }
      groupData.handle = groupData.displayName
        .toLowerCase()
        .replaceAll(' ', '_')
        .replace(/[^a-zA-Z0-9_]/g, '')
        .trim()
        .slice(0, 16);
    }

    createGroup({
      ...groupData,
      members: selectedMembersProfiles,
    })
      .then((g) => goto(`/groups/@${g.handle}`))
      .catch((e) => toast({ message: t(e.message), type: 'error' }));
  };

  getPageHeaderStore().set({
    title: t('groups.create.title'),
    actions: presetProps(
      CreateGroupButton as Component<Record<string, unknown>>,
      { handleSubmit },
    ),
  });
</script>

<div class="pb-12">
  <GroupForm bind:groupData />
  <Label title="Members" classes="px-4 mt-4">
    <ProfileSelector bind:selectedProfiles={selectedMembersProfiles} profilesToExclude={[me]} />
  </Label>
</div>
