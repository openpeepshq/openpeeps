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
  import {
    updatePostMutation,
    getPostStore,
    createPostMutation,
    deletePostMutation,
  } from '@openpeeps/svelte/api';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { hasVisibilityChanged, truncateText } from '@openpeeps/common/lib';
  import { toaster } from '@openpeeps/svelte/utils';

  interface Props {
    post: PostWithMeta;
  }

  let { post: initialPost }: Props = $props();
  let post = $state(structuredClone(initialPost));
  let event = $derived(post.data as Event);

  const eventId = page.params.eventId;
  const postQuery = getPostStore(eventId);
  const updatePost = updatePostMutation({ id: eventId });
  const createPost = createPostMutation();
  const deletePost = deletePostMutation({
    id: post.id,
  });
  const toast = toaster();

  const handleSubmit = async () => {
    const pastAudienceSetting = {
      visibility: initialPost.visibility,
      groupId: initialPost.groupId,
      audience: initialPost.audience,
    };
    const newAudienceSetting = {
      visibility: post.visibility,
      groupId: post.groupId,
      audience: post.audience,
    };
    if (hasVisibilityChanged(pastAudienceSetting, newAudienceSetting)) {
      deletePost()
        .then(() => {
          createPost({
            ...post,
            data: { ...post.data, ...event },
          })
            .then((eventPost) => {
              return goto(`/posts/${eventPost.id}`);
            })
            .catch((err) => toast({ message: err.message, type: 'error' }));
        })
        .catch((err) => toast({ message: err.message, type: 'error' }));
    } else {
      await updatePost(event);
      await goto(`/posts/${post.id}`);
    }
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

<EventForm bind:postData={post as PostCreationData} isEdit bind:valid />
