<script lang="ts">
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { toast } from '$lib/utils/toast';
  import { Button } from '@openpeeps/ui';
  import { me } from '$lib/api';
  import { Avatar } from '$lib/components/core/profile';
  import { createPostMutation } from '$lib/api';
  import {
    type MentionWithProfile,
    type PublicPost,
    type PostDataUnion,
    type PostCreationData,
  } from '@openpeeps/common/types';
  import { onMount } from 'svelte';
  import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
  import { replyDataStore, resetReplyData } from './stores';
  import ThreadPost from '$lib/components/core/post/feed/threaded/ThreadPost.svelte';
  import PollForm from './PollForm.svelte';
  import NoteForm from './NoteForm.svelte';
  import PreviewLinks from './PreviewLinks.svelte';
  import Attachments from './Attachments.svelte';
  import PostTypeSwitcher from './PostTypeSwitcher.svelte';
  import PostInputActions from './PostInputActions.svelte';

  const toastStore = getToastStore();

  interface Props {
    inReplyTo: PublicPost;
    close: () => void;
    mentions?: MentionWithProfile[];
  }

  let { inReplyTo, close, mentions = $bindable([]) }: Props = $props();

  let valid: boolean = $state(false);

  const createPost = createPostMutation();
  const postDataStore = replyDataStore(inReplyTo.id);

  const handlePublish = async () => {
    if (!valid) {
      return;
    }
    await createPost({
      ...$postDataStore,
      audience: inReplyTo.audience,
      mentions,
    })
      .then(() =>
        toastStore.trigger(
          toast({
            message: `Reply created successfully`,
            background: 'variant-filled-success',
            autohide: true,
          }),
        ),
      )
      .catch(() =>
        toastStore.trigger(
          toast({
            message: `An error occurred while creating the reply`,
            background: 'variant-filled-error',
            autohide: true,
          }),
        ),
      )
      .then(() => resetReplyData(inReplyTo.id))
      .then(close);
  };
  // ----------- LIFECYCLE ------------
  onMount(() => {
    $postDataStore.visibility = inReplyTo.visibility;
    $postDataStore.groupId = inReplyTo.groupId ?? undefined;
    $postDataStore.inReplyToId = inReplyTo.id;
  });

  const onchange = (postData: PostDataUnion) => {
    postDataStore.update((oldPostData) => ({
      ...oldPostData,
      data: { ...oldPostData.data, ...postData },
    }));
  };

  const onChangeType = (postData: PostCreationData) => {
    postDataStore.set(postData);
  };
</script>

<ModalWrapper>
  <ModalHeader title={'Reply'} />
  <div class="w-full">
    <ThreadPost post={inReplyTo} noActions />
    <div class="w-full">
      <div class="m-4 flex gap-2">
        <div>
          <Avatar profile={$me} size={3} />
        </div>
        <div class=" w-full">
          {#if $postDataStore.data.type === 'note'}
            <NoteForm postData={$postDataStore} bind:valid {onchange} />
          {:else if $postDataStore.data.type === 'question'}
            <PollForm postData={$postDataStore} bind:valid {onchange} />
          {/if}
        </div>
      </div>
    </div>
    <PreviewLinks content={$postDataStore.data.content} />
    <Attachments postData={$postDataStore.data} />
  </div>

  <ModalFooter extraClassNames="border-t-0">
    <div class="w-full">
      <div class="mx-2 flex w-full items-center justify-between">
        <PostInputActions postData={$postDataStore.data} />
        <PostTypeSwitcher postData={$postDataStore} onchange={onChangeType} />
      </div>
      <div class="my-2 w-full border-t border-neutral-300"></div>
      <div class="flex items-center justify-end gap-x-2">
        <Button
          title="Reply"
          variant="variant-filled-primary"
          action={handlePublish}
          disabled={!valid}
        >
          Reply
        </Button>
      </div>
    </div>
  </ModalFooter>
</ModalWrapper>
