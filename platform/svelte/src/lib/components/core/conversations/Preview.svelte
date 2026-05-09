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

  let lastMessage: PublicPost = $derived(conversation.slice(-1)[0]);

  let participants = $derived(lastMessage.audience || []);
  let unseenCount = $derived(
    conversation.filter((message) => message.profile.id !== me?.id && message.seen === false).length,
  );
</script>

<div class="relative flex w-full flex-col gap-x-1 border-b p-3 sm:p-4 {unseenCount ? 'border-l-primary-500 bg-primary-500/5 border-l-4' : ''}">
  {#if unseenCount}
    <span
      class="bg-primary-500 absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
      aria-label="{unseenCount} unseen messages"
      title="{unseenCount} unseen messages"
    >
      {unseenCount}
    </span>
  {/if}
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
