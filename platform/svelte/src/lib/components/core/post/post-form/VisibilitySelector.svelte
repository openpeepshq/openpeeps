<script lang="ts">
  import { getModalManager } from '@openpeeps/ui';
  import PostAudienceSelector from './PostAudienceSelector.svelte';
  import type {
    AudienceSetting,
    PostCreationData,
    PublicProfile,
  } from '@openpeeps/common/types';
  import { Avatar, GroupCardFromId } from '$lib/components';
  import { buildAudienceChoices } from './constants';
  import PostAudienceModal from './PostAudienceModal.svelte';
  import { getCurrentProfile } from '$lib/auth';

  const me = getCurrentProfile();

  const modalManager = getModalManager();

  interface Props {
    postData: PostCreationData;
    isEdit?: boolean;
    disabled?: boolean;
    showDirect?: boolean;
    setAudience: (audienceSetting?: AudienceSetting) => void;
  }

  let {
    postData,
    showDirect = false,
    disabled = false,
    isEdit = false,
    setAudience,
  }: Props = $props();

  const audienceChoices = $derived(buildAudienceChoices(postData.type, me));

  let updatedAudienceSetting = $state<AudienceSetting>(postData);

  const doSetAudience = (audienceSetting?: AudienceSetting) => {
    if (audienceSetting) {
      updatedAudienceSetting = audienceSetting;
    }
    setAudience(audienceSetting);
  };
</script>

<button
  title="Change audience"
  onclick={() => {
    if (isEdit) {
      modalManager.show(PostAudienceModal, {
        audience: postData.audience as PublicProfile[],
      });
      return;
    }
    modalManager.show(
      PostAudienceSelector,
      {
        visibility: postData.visibility,
        groupId: postData.groupId!,
        audience: postData.audience!,
        type: postData.type,
        showDirect,
      },
      doSetAudience,
    );
  }}
  class="flex h-10 w-full items-center"
  {disabled}
>
  {#if updatedAudienceSetting.visibility === 'group'}
    <span class="flex items-center gap-1 text-sm font-normal">
      <span class="pr-2">
        {audienceChoices.find((c) => c.value === 'group')?.description}
      </span>
      {#if updatedAudienceSetting.groupId}
        <GroupCardFromId
          groupId={updatedAudienceSetting.groupId}
          showAction={false}
          avatarSize={1.5}
          noPadding
          oneLine
        />
      {/if}
    </span>
  {:else if updatedAudienceSetting.visibility === 'direct'}
    <span class="flex items-center gap-1 text-sm font-light">
      <span class="pr-2">
        {audienceChoices.find((c) => c.value === 'direct')?.description}
      </span>
      <span class="flex items-center">
        {#each (updatedAudienceSetting.audience ?? []).slice(0, 5) as profile (profile.id)}
          <Avatar
            {profile}
            borderless
            size={1.2}
            containerClass="!p-0 border-none -ml-2"
          />
        {/each}
        {#if (updatedAudienceSetting.audience?.length ?? 0) > 5}
          <span class="text-sm font-light"
            >+{(updatedAudienceSetting.audience?.length ?? 0) - 5}</span
          >
        {/if}
      </span>
    </span>
  {:else}
    <span class="text-sm font-light">
      {audienceChoices.find(
        (c) => c.value === updatedAudienceSetting.visibility,
      )?.description ?? ''}
    </span>
  {/if}
</button>
