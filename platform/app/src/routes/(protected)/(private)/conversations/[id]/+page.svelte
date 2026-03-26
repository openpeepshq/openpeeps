<script lang="ts">
  import { onMount } from 'svelte';
  import { ForwardIcon } from 'lucide-svelte';
  import { Input, Button } from '@openpeeps/ui';
  import type { PublicProfile, PostCreationData } from '@openpeeps/common/types';
  import { profileName, canCreatePost } from '@openpeeps/common/lib';
  import { scrollToBottom, toaster } from '@openpeeps/svelte/utils';
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import {
    MessageInThread,
    ParticipantsCard,
    Avatar,
    AccessDeniedLoader,
  } from '@openpeeps/svelte/components';
  import {
    conversationStore,
    postToConversationMutation,
    conversationsListStore,
  } from '@openpeeps/svelte/api';
  import { getCurrentProfile } from '@openpeeps/svelte/auth';
  import { page } from '$app/state';

  const me = getCurrentProfile();
  getPageHeaderStore().set({ title: 'Messages' });

  const toast = toaster();
  const { id } = page.params;

  const conversationQuery = conversationStore(id);
  const conversationsQuery = conversationsListStore();
  const createMessage = postToConversationMutation({ id });

  let participants: PublicProfile[] = $derived(
    $conversationQuery.data
      ?.slice(-1)[0]
      ?.audience?.filter((a) => a.id !== me.id) ?? [],
  );

  let newMessageText: string = $state('');
  const maxLength = 500;
  let charCount = $derived(newMessageText.length);
  let isOverLimit = $derived(charCount > maxLength);

  let endOfThread: HTMLElement | undefined = $state();

  let sending = false;

  const sendNewMessage = async () => {
    if (!newMessageText.trim() || newMessageText.length > maxLength) {
      return;
    }
    sending = true;
    const lastMessage = $conversationQuery.data?.slice(-1)[0];

    const data: PostCreationData = {
      visibility: 'direct',
      audience: lastMessage?.audience,
      data: {
        type: 'note',
        content: newMessageText,
      },
      type: 'note',
    };

    await createMessage(data)
      .then(() => {
        scrollToBottom(endOfThread);

        newMessageText = '';
        $conversationsQuery.refetch();
      })
      .finally(() => {
        sending = false;
      })
      .catch(() => {
        toast({
          message: 'Failed to send message',
          type: 'error',
        });
      });
  };

  $effect(() => {
    if ($conversationQuery.isSuccess) {
      scrollToBottom(endOfThread);
    }
  });

  onMount(() => {
    scrollToBottom(endOfThread);
  });

  const canSendMessage = $derived(canCreatePost(me, 'note', 'direct'));
</script>

<AccessDeniedLoader queries={[$conversationQuery]}>
  <div class="flex min-h-screen flex-col">
    <!-- header -->
    <div class="bg-surface-50 sticky top-16 z-10 w-full flex-grow-0 border-b">
      {#if participants.length === 1}
        <div class="flex w-full flex-col items-center p-2">
          <Avatar profile={participants[0]} navigate />
          <h4 class="font-semibold">{profileName(participants[0])}</h4>
          <h5>@{participants[0].handle}</h5>
          <p>{participants[0].bio || ''}</p>
        </div>
      {:else if participants.length > 1}
        <span class="hidden md:block">
          <ParticipantsCard {participants} max={5} truncate />
        </span>
        <span class="md:hidden">
          <ParticipantsCard {participants} max={2} truncate />
        </span>
      {/if}
    </div>
    <div class="mt-36 flex-grow px-3 md:mt-16">
      {#each $conversationQuery.data as message, index (message.id)}
        <MessageInThread
          previous={$conversationQuery.data?.[index - 1]}
          {message}
          multipleParticipants={participants.length > 1}
        />
      {/each}
    </div>

    <div bind:this={endOfThread}></div>

    <div
      class="bg-surface-50 sticky bottom-0 right-0 w-full flex-grow-0 border-t p-2"
    >
      <div
        class="bg-surface-300 flex items-center justify-center gap-x-2 rounded-xl p-1"
      >
        <Input
          onclick={() => {
            if (!canSendMessage) {
              toast({
                message: 'You do not have permission to send messages',
                type: 'error',
              });
              return;
            }
          }}
          disabled={!canSendMessage}
          oninput={() => newMessageText || scrollToBottom(endOfThread)}
          onkeypress={(e) =>
            canSendMessage &&
            e.code === 'Enter' &&
            !sending &&
            newMessageText &&
            !isOverLimit &&
            sendNewMessage()}
          bind:value={newMessageText}
          placeholder="Send a message"
          class={[
            'bg-surface-300 w-[90%] border-none outline-none',
            isOverLimit && 'text-red-500',
          ]}
          maxlength={maxLength}
        />
        <div class="mt-1 text-xs text-gray-500">
          <span class:text-red-500={isOverLimit}>{charCount}/{maxLength}</span>
        </div>
        <Button
          disabled={!canSendMessage || sending || newMessageText.length === 0}
          title="Send"
          action={sendNewMessage}
        >
          <ForwardIcon size={25} />
        </Button>
      </div>
    </div>
  </div>
</AccessDeniedLoader>
