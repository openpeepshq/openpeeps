<script lang="ts">
  import { InfoIcon, Bug, Copy, X, CopyCheck } from 'lucide-svelte';
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
  import ReactionMenu from '../../pieces/ReactionMenu.svelte';
  import { truncateText } from '@openpeeps/common';
  import AudioOutputSelector from '../../pieces/AudioOutputSelector.svelte';
  import { i18nContext } from '$lib/components/i18n';

  const { t } = i18nContext();
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
  const observerLinkUrl = $derived.by(() => {
    const path = $observerLinkQuery.data?.path;
    if (!path) return undefined;
    return path.startsWith('http') ? path : `${window.location.origin}${path}`;
  });
  const closeDrawerMenu = () => drawerMenuContext.set(undefined);

  const handleEmojiSelect = async (emoji: string) => {
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
      <div class="absolute bottom-12 right-0 z-50 md:w-max">
        <ReactionMenu onSelect={handleEmojiSelect} />
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
          <h1 class="text-lg">{t('jams.details.panelHeading')}</h1>
          <button
            title={t('jams.details.closePanel')}
            class=""
            onclick={() => popupMenuContext.set(undefined)}
          >
            <X />
          </button>
        </div>
        <div class="mt-2">
          <h4>{t('jams.details.joiningInfoHeading')}</h4>

          <span class="my-2 text-lg">
            {location.href}
          </span>

          <button
            title={copied
              ? t('jams.details.copiedJoiningInfoButtonTitle')
              : t('jams.details.copyJoiningInfoButtonTitle')}
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
              >{copied
                ? t('jams.details.copiedJoiningInfo')
                : t('jams.details.copyJoiningInfo')}</span
            >
          </button>
        </div>
        {#if $observerLinkQuery.isSuccess}
          <div class="mt-4">
            <h4>{t('jams.details.observerLinkHeading')}</h4>

            <span class="my-2 text-lg">
              {truncateText(observerLinkUrl ?? '', 25)}
            </span>

            <button
              title={observerLinkCopied
                ? t('jams.details.copiedObserverLinkButtonTitle')
                : t('jams.details.copyObserverLinkButtonTitle')}
              class="mt-4 flex items-center"
              onclick={() => {
                if (observerLinkUrl) {
                  navigator.clipboard.writeText(observerLinkUrl);
                }
                observerLinkCopied = true;
              }}
            >
              {#if observerLinkCopied}
                <CopyCheck />
              {:else}
                <Copy />
              {/if}
              <span class="ml-2 text-sm"
                >{observerLinkCopied
                  ? t('jams.details.copiedObserverLink')
                  : t('jams.details.copyObserverLink')}</span
              >
            </button>
          </div>
        {/if}
      </div>
    {/if}
    <button
      title={t('jams.mobileMenu.jamDetails')}
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
        title={t('jams.drawer.toggleDebug')}
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
