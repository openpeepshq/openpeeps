<script lang="ts">
  import { truncateText } from '@openpeeps/common/lib';
  import type { GroupWithMeta } from '@openpeeps/common/types';
  import ShareButton from './buttons/ShareButton.svelte';
  import MoreOptionsButton from './buttons/MoreOptionsButton.svelte';
  import JoinGroupButton from '../JoinGroupButton.svelte';
  import { GroupAvatar } from '..';
  import { getCurrentProfile } from '$lib/auth';
  import { i18nContext } from '$lib/components/i18n';

  interface Props {
    group: GroupWithMeta;
  }

  let { group }: Props = $props();
  const { t } = i18nContext();
  let me = getCurrentProfile();
</script>

<div class="relative rounded-b-md border-b">
  <div class="mb-3">
    <div class="bg-surface-200 relative h-52 w-full overflow-hidden">
      <img
        src={group?.header || '/img/default-group-header.png'}
        alt="banner"
        class="absolute left-0 top-0 h-full w-full object-cover"
      />
      <GroupAvatar
        {group}
        size={6}
        containerClass="absolute -bottom-12 left-4"
        borderless={true}
      />
    </div>
    <div class="flex w-full justify-end space-x-2 p-2">
      {#if me?.memberships.find((m) => m.group.id === group?.id)}
        <div
          class="flex size-10 items-center justify-center rounded-full border"
        >
          <ShareButton />
        </div>
        <div
          class="flex size-10 items-center justify-center rounded-full border"
        >
          <MoreOptionsButton {group} />
        </div>
      {:else if group}
        <JoinGroupButton {group} />
      {/if}
    </div>
    <div class="p-2">
      <h1 class="mt-4 text-base font-semibold">
        {truncateText(group.displayName || group?.handle, 50)}
      </h1>
      <a class="hover:anchor" title={t('groups.viewMembers')} href={`/groups/@${group?.handle}/members`}>
        {group?.membersCount} member{group?.membersCount === 1 ? '' : 's'}
      </a>
    </div>
  </div>
</div>
