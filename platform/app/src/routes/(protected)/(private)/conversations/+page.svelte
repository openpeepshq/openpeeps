<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    AccessDeniedLoader,
    ChatPreview,
    CreateNewConversation,
  } from '@openpeeps/svelte/components';
  import { MessageCircleOff, MessageSquarePlus } from 'lucide-svelte';
  import { conversationsListStore } from '@openpeeps/svelte/api';
  import { setPageHeader, setPlusButtonActions } from '@openpeeps/svelte/stores';
  import { i18nContext } from '@openpeeps/svelte/components';
  import { getModalManager } from '@openpeeps/ui';

  const modalManager = getModalManager();
  const { t } = i18nContext();

  const conversationsQuery = conversationsListStore();

  setPageHeader({ title: t('navigation.conversations') });
  setPlusButtonActions({
    title: t('conversations.newMessage'),
    action: () => modalManager.show(CreateNewConversation),
    icon: MessageSquarePlus,
  });
</script>

<AccessDeniedLoader queries={[$conversationsQuery]}>
  {#if !$conversationsQuery.data?.length}
    <div class="flex h-[80vh] items-center justify-center">
      <MessageCircleOff size={40} />
      <p class="text-gray-500">
        {t('conversations.noMessages')}
      </p>
    </div>
  {:else}
    {#each $conversationsQuery.data as conversation (conversation[0].id)}
      <button
        title="Open conversation"
        class="hover:bg-surface-300 text-left transition-all"
        onclick={() => goto(`/conversations/${conversation[0].id}`)}
      >
        <ChatPreview {conversation} />
      </button>
    {/each}
  {/if}
</AccessDeniedLoader>
