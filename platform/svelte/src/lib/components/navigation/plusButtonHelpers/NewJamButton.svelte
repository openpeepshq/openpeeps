<script lang="ts">
  import {
    type GroupWithMeta,
    type ProfileWithMeta,
    type VisibilityType,
  } from '@openpeeps/common';
  import { i18nContext } from '$lib/components/i18n';
  import NewPostButton from './NewPostButton.svelte';
  import { getModalManager } from '@openpeeps/ui';
  import { CreateNewJam } from '$lib/components/core';

  const modalManager = getModalManager();

  const { t } = i18nContext();

  type Props = {
    visibility: VisibilityType;
    currentProfile?: ProfileWithMeta;
    group?: GroupWithMeta;
  };

  let { visibility, currentProfile, group }: Props = $props();
</script>

<NewPostButton
  type="event"
  {visibility}
  {currentProfile}
  {group}
  title={t('jams.create.title')}
  action={() => modalManager.show(CreateNewJam)}
/>
