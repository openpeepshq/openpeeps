<script lang="ts">
  // @ts-nocheck
  import { getNewPostStores, getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { EventForm } from '@openpeeps/svelte/components';
  import { type PostCreationData } from '@openpeeps/common/types';
  import { TextButton } from '@openpeeps/ui';
  import { presetProps } from '@openpeeps/svelte/utils';
  import { createPostMutation } from '@openpeeps/svelte/api';
  import { goto } from '$app/navigation';
  import { toaster } from '@openpeeps/svelte/utils';
  import { eventSanitizer} from '@openpeeps/svelte/stores';

  const sanitize = eventSanitizer();
  const createPost = createPostMutation();
  const toast = toaster();

  const newPostStores = getNewPostStores();
  let eventCreationData: PostCreationData = sanitize(newPostStores.event);
  let isValid = $state(false);

  const handleSubmit = async () =>
    createPost(eventCreationData)
      .then((eventPost) => {
        newPostStores.resetNewEventState();
        return goto(`/posts/${eventPost.id}`);
      })
      .catch((err) => toast({ message: err.message, type: 'error' }));

  $effect(() => {
    getPageHeaderStore().set({
      actions: presetProps(TextButton, {
        action: handleSubmit,
        variant: 'variant-filled-primary',
        text: 'Create event',
        disabled: !isValid,
      }),
    });
  });

  const onchange = (data: PostCreationData) => {
    newPostStores.event = data;
  };
</script>

<div class="pb-12">
  <EventForm
    bind:postData={eventCreationData}
    {onchange}
    bind:valid={isValid}
  />
</div>
