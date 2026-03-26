<script lang="ts">
  import { Button, stopPropagation } from '@openpeeps/ui';
  import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
  import { buildAudienceChoices } from '$lib/components/core/post/post-form/constants';
  import type {
    AudienceSetting,
    GroupWithMeta,
    PostType,
    PublicProfile,
    VisibilityType,
  } from '@openpeeps/common/types';
  import { me } from '$lib/api';
  import GroupCard from '$lib/components/core/groups/GroupCard.svelte';
  import { CheckCircle } from 'lucide-svelte';
  import GroupCardFromId from '$lib/components/core/groups/GroupCardFromId.svelte';
  import { i18nContext } from '$lib/components/i18n';
  import ProfileSelector from '$lib/components/core/profile/ProfileSelector.svelte';
  import { checkGroupCapabilities } from '@openpeeps/common';

  const { t } = i18nContext();

  interface Props {
    visibility: VisibilityType;
    groupId?: string | undefined;
    audience?: PublicProfile[];
    type: PostType;
    showDirect?: boolean;
    close: () => void;
    setResponse: (audienceSettings: AudienceSetting) => void;
  }

  let {
    visibility = $bindable(),
    groupId = $bindable(undefined),
    audience = $bindable(undefined),
    type,
    showDirect = false,
    close,
    setResponse,
  }: Props = $props();

  const prefix = `visibility.${type === 'event' ? 'event' : 'post'}.`;

  const i = (key: string) => t(`${prefix}${key}`);

  let showGroupSelector = $state(false);
  let showAudienceSelector = $state(false);

  const selectVisibility = (selection: VisibilityType) => {
    if (selection === 'group' && !groupId) {
      showGroupSelector = true;
    }
    if (selection === 'direct' && !audience) {
      audience = [];
    }
    if (selection !== 'group') {
      groupId = undefined;
    }
    if (selection !== 'direct') {
      audience = undefined;
    }
    visibility = selection;
  };

  const selectGroup = (selection: GroupWithMeta) => {
    groupId = selection.id;
    showGroupSelector = false;
  };

  const confirmAndClose = () => {
    setResponse({ visibility, groupId, audience });
    close();
  };

  const getFilteredGroups = () => {
    return (
      $me?.memberships
        ?.map((m) => m.group)
        .filter(
          (grp) =>
            checkGroupCapabilities([`core-posts-create-${type}`], $me, grp)
              .success,
        ) || []
    );
  };

  const groups = $derived(getFilteredGroups());
  const availableAudienceChoices = $derived(
    buildAudienceChoices(type, $me, { showDirect }),
  );
</script>

<ModalWrapper>
  <ModalHeader title={i('title')} />
  <!-- body -->
  {#if showGroupSelector}
    <article class="flex flex-col p-4">
      {#each groups as group (group.id)}
        <Button
          title={'Select group'}
          action={() => selectGroup(group as GroupWithMeta)}
        >
          <GroupCard group={group as GroupWithMeta}>
            {#snippet action()}
              <div>
                {#if groupId === group.id}
                  <CheckCircle />
                {/if}
              </div>
            {/snippet}
          </GroupCard>
        </Button>
      {/each}
      {#if $me?.memberships.length === 0}
        <div class="flex justify-center py-4">
          <h4>{i('no-groups')}</h4>
        </div>
      {/if}
    </article>
    <ModalFooter>
      <div class="flex gap-x-2">
        <Button
          title="Back"
          variant="variant-ringed-surface"
          action={() => (showGroupSelector = false)}>Done</Button
        >
      </div>
    </ModalFooter>
  {:else if showAudienceSelector}
    <article class="flex flex-col p-4">
      <ProfileSelector bind:selectedProfiles={audience} />
    </article>
    <ModalFooter>
      <div class="flex gap-x-2">
        <Button
          title="Back"
          variant="variant-ringed-surface"
          action={() => (showAudienceSelector = false)}>Done</Button
        >
      </div>
    </ModalFooter>
  {:else}
    <article class="flex flex-col p-4">
      <p class="text-sm font-light">{i('description')}</p>
      <div class="mt-7">
        {#each availableAudienceChoices as setting}
          <Button
            title={setting.title}
            action={() => selectVisibility(setting.value)}
            class="w-full  p-4"
          >
            {@const SvelteComponent = setting?.icon?.ref}
            <div class="flex w-full items-center justify-between">
              <div class="flex items-center gap-3">
                <div
                  class="bg-surface-50 flex h-12 w-12 items-center justify-center rounded-full"
                >
                  <SvelteComponent class="h-6 w-6" />
                </div>
                <div class="flex flex-col items-start">
                  <p class="text-base font-medium">{setting.title}</p>
                  <p class="pr-10 text-sm font-light">
                    {setting.description}
                  </p>
                </div>
              </div>
              <div
                class="flex h-4 w-4 items-center justify-center rounded-full border border-neutral-500"
              >
                <div
                  class={`h-2 w-2 rounded-full ${visibility === setting.value ? 'bg-primary-500' : ''}`}
                ></div>
              </div>
            </div>
            {#if setting.value === 'group' && groupId}
              <div class="pl-12 text-left">
                <button
                  title="Change group"
                  onclick={() => (showGroupSelector = true)}
                >
                  <GroupCardFromId
                    {groupId}
                    showAction={false}
                    avatarSize={1.5}
                  />
                </button>
              </div>
            {/if}
            {#if setting.value === 'direct' && audience}
              <button
                class="w-full pl-12 text-left"
                onclick={stopPropagation(() => undefined)}
              >
                <ProfileSelector overRide bind:selectedProfiles={audience} />
              </button>
            {/if}
          </Button>
        {/each}
      </div>
    </article>
    <ModalFooter>
      <div class="flex gap-x-2">
        <Button title="Back" variant="variant-ringed-surface" action={close}
          >Back</Button
        >
        <Button
          title="Done"
          variant="variant-filled-primary"
          action={confirmAndClose}>Done</Button
        >
      </div>
    </ModalFooter>
  {/if}
</ModalWrapper>
