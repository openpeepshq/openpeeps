<script lang="ts">
  import { InfoIcon, Bug, Copy, X, CopyCheck } from 'lucide-svelte';
  import { emojis, RECORD_OPTIONS } from '$lib/components/core/jams/constants';
  import {
    getDrawerContext,
    getJamContext,
    initPopupMenuContext,
    getLivekitRoom,
  } from '$lib/components/core/jams/context';
  import LeaveCloseButton from '$lib/components/core/jams/pieces/LeaveCloseButton.svelte';
  import HandSwitch from '../../pieces/HandSwitch.svelte';
  import { onMount } from 'svelte';
  import { addEventMutation, observerLinkStore } from '$lib/api';
  import { sendReaction } from '../../actions';
  import { subscribePushNotifications } from '$lib/push';
  import { getServerInfo } from '$lib/server';
  import ScreenShareSwitch from '../../pieces/ScreenShareSwitch.svelte';
  import MicrophoneSelectorAndSwitch from '../../pieces/MicrophoneSelectorAndSwitch.svelte';
  import CameraSelectorAndSwitch from '../../pieces/CameraSelectorAndSwitch.svelte';
  import BlurSwitch from '$lib/components/core/jams/pieces/BlurSwitch.svelte';
  import UserButton from '$lib/components/core/jams/pieces/buttons/UserButton.svelte';
  import ReactionsButton from '../../pieces/ReactionsButton.svelte';
  import ChatDrawerButton from '../../pieces/ChatDrawerButton.svelte';
  import RecordSwitch from '../../pieces/RecordSwitch.svelte';
  import { truncateText } from '@openpeeps/common';
  import AudioOutputSelector from '../../pieces/AudioOutputSelector.svelte';

  const {
    vapid: { publicKey: pushKey },
  } = getServerInfo();

  const addEvent = addEventMutation();

  const { jam, jamEvent, jamPost } = getJamContext();
  const room = getLivekitRoom();
  let copied = $state(false);
  let observerLinkCopied = $state(false);

  const popupMenuContext = initPopupMenuContext();

  const drawerMenuContext = getDrawerContext();
  const observerLinkQuery = observerLinkStore(jamPost.id);
  const closeDrawerMenu = () => drawerMenuContext.set(undefined);

  const handleEmojiClick = async (emoji: string) => {
    await sendReaction(room, emoji, addEvent);
  };

  onMount(() => {
    subscribePushNotifications(pushKey);
  });
</script>

<div
  class="hidden w-full flex-none items-center justify-between px-4 py-3 md:flex"
>
  <h1 class="no-wrap truncate pr-2">{jamEvent.name}</h1>

  <div class="relative flex items-center gap-x-4">
    <!-- emoji menu -->
    {#if $popupMenuContext === 'emoji'}
      <div class="bg-surface-200 absolute bottom-12 right-0 rounded-2xl p-2">
        <div class="flex gap-x-2">
          {#each emojis as emoji (emoji)}
            <button
              title={emoji}
              onclick={async () => await handleEmojiClick(emoji)}
              class="p-2 text-lg">{emoji}</button
            >
          {/each}
        </div>
      </div>
    {/if}

    <MicrophoneSelectorAndSwitch />
    <CameraSelectorAndSwitch />
    <AudioOutputSelector />
    <RecordSwitch />
    <BlurSwitch />
    <HandSwitch />
    <ScreenShareSwitch />
    <ReactionsButton />
    <ChatDrawerButton />
  </div>
  <div class="relative flex items-center gap-x-4">
    <!-- JAM DETAILS -->
    {#if $popupMenuContext === 'jam-details'}
      <div
        class="w-128 bg-surface-50 absolute bottom-20 right-12 z-20 mt-2 rounded-md p-2"
      >
        <div
          class="flex items-center justify-between border border-b-[0.5px] py-1"
        >
          <h1 class="text-lg">Jam details</h1>
          <button
            title="Close Jam Details"
            class=""
            onclick={() => popupMenuContext.set(undefined)}
          >
            <X />
          </button>
        </div>
        <div class="mt-2">
          <h4>Joining Info</h4>

          <span class="my-2 text-lg">
            {location.href}
          </span>

          <button
            title="{copied ? 'Copied' : 'Copy'} Joining Info"
            class="mt-4 flex items-center"
            onclick={() => {
              navigator.clipboard.writeText(location.href);
              copied = true;
            }}
          >
            {#if copied}
              <CopyCheck />
            {:else}
              <Copy />
            {/if}
            <span class="ml-2 text-sm"
              >{copied ? 'Copied' : 'Copy'} joining info</span
            >
          </button>
        </div>
        {#if $observerLinkQuery.isSuccess}
          <div class="mt-4">
            <h4>Observer Link</h4>

            <span class="my-2 text-lg">
              {truncateText($observerLinkQuery.data.path as string, 25)}
            </span>

            <button
              title="{observerLinkCopied ? 'Copied' : 'Copy'} Observer Link"
              class="mt-4 flex items-center"
              onclick={() => {
                navigator.clipboard.writeText(
                  $observerLinkQuery.data.path as string,
                );
                observerLinkCopied = true;
              }}
            >
              {#if observerLinkCopied}
                <CopyCheck />
              {:else}
                <Copy />
              {/if}
              <span class="ml-2 text-sm"
                >{observerLinkCopied ? 'Copied' : 'Copy'} observer link</span
              >
            </button>
          </div>
        {/if}
      </div>
    {/if}
    <button
      title="Jam Details"
      onclick={() => {
        if ($popupMenuContext === 'jam-details') {
          popupMenuContext.set(undefined);
        } else {
          popupMenuContext.set('jam-details');
        }
      }}
      class:bg-surface-500={$popupMenuContext === 'jam-details'}
    >
      <InfoIcon
        class={$popupMenuContext !== 'jam-details'
          ? 'text-token'
          : 'text-on-primary-token'}
      />
    </button>
    <UserButton />

    <!-- for triggering debug panel -->
    {#if location.hash.includes('#debug')}
      <button
        title="Toggle Debug Panel"
        onclick={() =>
          $drawerMenuContext
            ? closeDrawerMenu()
            : drawerMenuContext.set('debug')}
      >
        <Bug />
      </button>
    {/if}

    <!--
		<button
			on:click={() => {
				$drawerMenuContext
					? closeDrawerMenu()
					: drawerMenuContext.set('host-controls');
			}}
		>
			<ShieldAlert />
		</button>
		-->
    <LeaveCloseButton />
  </div>
</div>
