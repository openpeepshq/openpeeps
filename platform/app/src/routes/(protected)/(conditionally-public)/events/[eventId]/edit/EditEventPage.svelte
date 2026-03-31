<script lang="ts">
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { EventForm } from '@openpeeps/svelte/components';
  import {
    type Event,
    type PostWithMeta,
    type PostCreationData,
  } from '@openpeeps/common/types';
  import { TextButton } from '@openpeeps/ui';
  import { presetProps } from '@openpeeps/svelte/utils';
  import { updatePostMutation, getPostStore } from '@openpeeps/svelte/api';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { truncateText } from '@openpeeps/common/lib';

  interface Props {
    post: PostWithMeta;
  }

  let { post }: Props = $props();

  let event = $derived(post.data as Event);

  const eventId = page.params.eventId;
  const postQuery = getPostStore(eventId);
  const updatePost = updatePostMutation({ id: eventId });

  const handleSubmit = async () => {
    const result = await updatePost({
      ...post,
    });
    await goto(`/posts/${result.id}`);
  };

  let valid = $state(false);

  getPageHeaderStore().set({
    title: `Edit event ${truncateText(($postQuery.data?.data as Event)?.name)}`,
    actions: presetProps(TextButton, {
      action: handleSubmit,
      variant: 'variant-filled-primary',
      text: 'Update event',
    }),
  });
</script>

<EventForm bind:postData={post as PostCreationData} isEdit={false} bind:valid />
