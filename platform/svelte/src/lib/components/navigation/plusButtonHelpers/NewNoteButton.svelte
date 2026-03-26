<script lang="ts">
  import {
    type GroupWithMeta,
    type ProfileWithMeta,
    type VisibilityType,
  } from '@openpeeps/common';
  import { i18nContext } from '$lib/components/i18n';
  import NewPostButton from './NewPostButton.svelte';
  import { getModalManager } from '@openpeeps/ui';
  import { NewPostModal } from '$lib/components/core/post';

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
  type="note"
  {visibility}
  {currentProfile}
  {group}
  title={t('posts.form.title')}
  action={() => modalManager.show(NewPostModal)}
/>
