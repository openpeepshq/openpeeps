<script lang="ts">
  import { setPlusButtonActions } from '$lib/stores';
  import {
    canCreatePost,
    type GroupWithMeta,
    type PostType,
    type ProfileWithMeta,
    type VisibilityType,
  } from '@openpeeps/common';
  import { getNewPostStores } from '$lib/stores';
  import { Plus } from 'lucide-svelte';
  import type { IconType } from '@openpeeps/ui';

  const newPostStores = getNewPostStores();

  type Props = {
    type: PostType;
    Icon?: IconType;
    visibility: VisibilityType;
    currentProfile?: ProfileWithMeta;
    group?: GroupWithMeta;
    title: string;
    action: () => void;
  };

  let {
    type,
    Icon = Plus,
    visibility,
    currentProfile,
    group,
    title,
    action,
  }: Props = $props();

  if (
    currentProfile &&
    canCreatePost(currentProfile, type, visibility, group)
  ) {
    setPlusButtonActions({
      title,
      action: () => {
        newPostStores[type].visibility = visibility;
        newPostStores[type].groupId = group?.id;
        action();
      },
      icon: Icon,
    });
  }
</script>
