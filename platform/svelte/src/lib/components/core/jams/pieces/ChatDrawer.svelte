<script lang="ts">
  import { getChatContext } from '../context';
  import { SendHorizontal, Loader } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { InfiniteScrollContainer, Textarea } from '@openpeeps/ui';
  import { type JamEvent } from '@openpeeps/common/types';
  import { scrollToBottom } from '$lib/utils/scrollHelpers';
  import Drawer from './Drawer.svelte';
  import JamChatMessage from './JamChatMessage.svelte';
  import { dateSorter } from '@openpeeps/common';

  let endOfThread: HTMLElement | undefined = $state();

  const chatContext = getChatContext();
  const { query, sessionEvents } = chatContext;

  let isLoading = $state(false);

  let newMessage = $state('');

  const handleSendMessage = async () => {
    if (!newMessage) return;
    isLoading = true;
    await chatContext.sendMessage(newMessage);
    newMessage = '';
    scrollToBottom(endOfThread);
    isLoading = false;
    setTimeout(() => {
      if (textareaRef) {
        textareaRef.focus();
      }
    }, 25);
  };

  let textareaRef: HTMLTextAreaElement | undefined = $state();

  onMount(() => {
    const timeout = setTimeout(() => {
      scrollToBottom(endOfThread);
    }, 800);
    return () => clearTimeout(timeout);
  });
</script>

<Drawer title="In-Jam Messages">
  <div class="z-10 box-content flex w-full flex-1 flex-col overflow-y-scroll">
    <div class="mb-0 flex-grow space-y-4 px-2 pb-4 md:mb-6">
      <InfiniteScrollContainer
        scrollTop
        {query}
        uniqueBy={(message) => message.id}
        additionalItems={$sessionEvents}
      >
        {#snippet empty()}
          <p class="mt-4 text-center text-neutral-400">No messages found</p>
        {/snippet}
        {#snippet children({ list })}
          {#each list
            ?.filter((ctx: JamEvent) => ctx.type !== 'reaction')
            .sort(dateSorter<JamEvent>()) as message (message.id)}
            <JamChatMessage {message} />
          {/each}
        {/snippet}
      </InfiniteScrollContainer>
    </div>

    <div bind:this={endOfThread} class="pb-4"></div>

    <div
      class="bg-surface-50 sticky bottom-0 flex w-full items-center gap-x-2 p-2"
    >
      <Textarea
        bind:ref={textareaRef}
        disabled={isLoading}
        bind:value={newMessage}
        oninput={() => newMessage || scrollToBottom(endOfThread)}
        onkeypress={(e) => {
          if (!(e.shiftKey || e.ctrlKey || e.altKey) && e.code === 'Enter') {
            handleSendMessage();
            e.preventDefault();
          }
        }}
        class="bg-surface-50 w-full border-none outline-none"
        placeholder="Send a message"
      />
      <button
        title="Send Message"
        disabled={isLoading}
        onclick={handleSendMessage}
      >
        {#if isLoading}
          <Loader />
        {:else}
          <SendHorizontal />
        {/if}
      </button>
    </div>
  </div>
</Drawer>
