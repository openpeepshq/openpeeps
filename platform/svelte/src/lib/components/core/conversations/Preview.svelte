<script lang="ts">
  import { Calendar } from 'lucide-svelte';
  import type { PublicPost } from '@openpeeps/common/types';
  import { OpenpeepsMarkdown, ConversationProfilesAvatar } from '$lib/components';
  import { UpdatingDate } from '@openpeeps/ui';
  import { getCurrentProfile } from '$lib/auth';
  import ConversationProfilesTitle from './ConversationProfilesTitle.svelte';
  import { truncateText } from '@openpeeps/common';

  interface Props {
    conversation: PublicPost[];
  }

  const me = getCurrentProfile();

  let { conversation }: Props = $props();

  const lastMessage: PublicPost = conversation.slice(-1)[0];

  const participants = lastMessage.audience || [];
</script>

<div class="flex w-full flex-col gap-x-1 border-b p-3 sm:p-4">
  <div class="flex items-center gap-4">
    <ConversationProfilesAvatar profiles={participants} />
    <div class="flex items-center">
      <ConversationProfilesTitle profiles={participants} />
    </div>
  </div>
  <span class="text-surface-500 text-sm"
    ><UpdatingDate date={lastMessage.createdAt} /></span
  >

  <div class="mt-2 flex flex-row gap-x-2 overflow-hidden items-start">
    <div class="flex flex-row items-center">
      <span> ~ </span>
      {#if me.id === lastMessage.profile.id}
        <span>Me</span>
      {:else}
        <span>
          @{truncateText(lastMessage.profile.handle, 8)}
        </span>
      {/if}
      <span> : </span>
    </div>
    {#if lastMessage.data?.type === 'event'}
      <Calendar />
      {lastMessage.data.name}
    {:else}
      <OpenpeepsMarkdown source={lastMessage.data?.content || ''} />
    {/if}
  </div>
</div>
