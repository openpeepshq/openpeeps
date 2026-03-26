<script lang="ts">
  import { onMount } from 'svelte';
  import { ConnectionState, Room } from 'livekit-client';
  import { Button } from '@openpeeps/ui';
  import { getTheme, jamFromEvent } from '@openpeeps/common/lib';
  import type { Event, PublicPost } from '@openpeeps/common/types';
  import {
    currentProfileSettingsStore,
    jamStateStore,
    joinJamMutation,
  } from '$lib/api';
  import { getCurrentProfile } from '$lib/auth';
  import { getServerInfo } from '$lib/server';
  import { getPageHeaderStore } from '$lib/stores';
  import { defaultRoomOptions } from '../constants';
  import {
    setJamContext,
    setLivekitRoom,
    setObserverContext,
    setWaitingRoom,
  } from '../context';
  import { connectionStateStore } from '../stores';
  import Lobby from '../lobby/Lobby.svelte';
  import VideoCall from '../roomTypes/videoCall/VideoCall.svelte';
  import { AccessDeniedLoader } from '$lib/components/layout';

  const serverInfo = getServerInfo();
  let profileSettingsQuery = currentProfileSettingsStore();
  let profileSettings = $profileSettingsQuery.data;
  const logoSmall = getTheme(
    serverInfo.communityConfig,
    profileSettings,
  ).logoSmall;

  const joinJam = joinJamMutation();

  const {
    jams: {
      livekit: { url: livekitUrl },
    },
  } = serverInfo;
  const me = getCurrentProfile();

  interface Props {
    jamPost: PublicPost;
    noLobby?: boolean;
    observer?: boolean;
  }

  let { jamPost, observer = false }: Props = $props();

  setObserverContext(observer);

  const event = jamPost.data as Event;
  const jam = jamFromEvent(jamPost)!;

  const jamStateQuery = jamStateStore(jamPost.id);

  getPageHeaderStore().set({
    title: `Jam Room - ${event.name}`,
  });

  const room = new Room(defaultRoomOptions[jam.type]);
  const connectionState = connectionStateStore(room);

  setJamContext(jamPost);
  setLivekitRoom(room);
  setWaitingRoom(jamPost);

  let canJoin: boolean = $derived(
    !!($jamStateQuery.data?.active || jam?.moderators.includes(me?.id ?? '')),
  );

  onMount(async () => {
    await room.prepareConnection(livekitUrl);
    if (observer) {
      const { token, livekitUrl } = await joinJam({ id: jamPost.id });
      await room.connect(livekitUrl, token);
    }
  });
</script>

{#if $connectionState === ConnectionState.Connected}
  {#if jam?.type === 'video-call'}
    <VideoCall />
  {/if}
{:else if observer}
  <div class="flex h-full w-full items-center justify-center">
    <span class="text-center text-lg"> Waiting for connecting to the jam </span>
  </div>
{:else if canJoin}
  <Lobby />
{:else}
  <div class="mx-auto flex h-full w-full items-center justify-center">
    <AccessDeniedLoader queries={[$jamStateQuery]}>
      {#if me}
        <div class="space-y-5">
          <img src={logoSmall} alt="Community Logo" class="mx-auto h-8" />
          <h3 class="text-center text-lg">{event.name}</h3>
          <div
            class="bg-surface-100 flex w-full flex-col items-center justify-center space-y-3 rounded border border-b-[0.2px] p-4"
          >
            <span>This Jam is not active</span>

            <Button
              title="Check out other jams"
              class="mt-4"
              variant="variant-filled-primary"
              action="/jams"
            >
              Check out other jams
            </Button>
          </div>
        </div>
      {:else}
        <div class="space-y-5">
          <img src={logoSmall} alt="Community Logo" class="mx-auto h-8" />
          <h3 class="text-center text-lg">{event.name}</h3>
          <div
            class="bg-surface-100 flex w-full flex-col items-center justify-center space-y-3 rounded border border-b-[0.2px] p-4"
          >
            <span>This Jam is not active</span>

            <Button
              title="Join community"
              class="mt-4"
              variant="variant-filled-primary"
              action="/auth/register"
            >
              Join community
            </Button>

            <span>
              Already have an account?
              <a class="anchor" href="/auth/login"> Log In </a>
            </span>
          </div>
        </div>
      {/if}
    </AccessDeniedLoader>
  </div>
{/if}
