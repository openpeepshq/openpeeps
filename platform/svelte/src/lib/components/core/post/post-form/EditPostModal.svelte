<script lang="ts">
  import { getToastStore } from '@skeletonlabs/skeleton';
  import { Button } from '@openpeeps/ui';
  import { abortUploadsForAttachments, updatePostMutation } from '$lib/api';
  import { onDestroy } from 'svelte';
  import { type PublicPost, type PostDataUnion } from '@openpeeps/common/types';
  import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
  import PollForm from './PollForm.svelte';
  import NoteForm from './NoteForm.svelte';
  import PostInputActions from './PostInputActions.svelte';
  import { toast } from '$lib/utils/toast';
  import { resetNewPostData } from './stores';
  import PreviewLinks from '$lib/components/core/post/post-form/PreviewLinks.svelte';
  import Attachments from '$lib/components/core/post/post-form/Attachments.svelte';
  import { i18nContext } from '$lib/components/i18n';
  import { updatePostStore } from './stores';
  import { stripFailedAttachments } from './actions';

  const { t } = i18nContext();

  const toastStore = getToastStore();

  interface Props {
    close: () => void;
  }

  let { close }: Props = $props();

  let postData = $derived($updatePostStore!);

  let valid: boolean = $state(false);

  const onchange = (postData: PostDataUnion) =>
    updatePostStore.update(
      (oldPost: PublicPost | undefined) =>
        oldPost && {
          ...oldPost,
          ...postData,
        },
    );

  const updatePost = updatePostMutation({ id: $updatePostStore?.id! });

  // Abort any still-streaming attachment upload when the modal goes away —
  // dismissing the edit dialog should surrender the upload, regardless of
  // whether the close was triggered by the user, the backdrop, or the
  // post-publish flow that has already done what it needs with the data.
  onDestroy(() => {
    abortUploadsForAttachments(postData?.data?.attachments);
  });

  const handlePublish = () =>
    valid &&
    updatePost({ ...postData, data: stripFailedAttachments(postData.data) })
      .then(() =>
        toastStore.trigger(
          toast({
            message: t('posts.edit.success'),
            background: 'variant-filled-success',
            autohide: true,
          }),
        ),
      )
      .catch(() =>
        toastStore.trigger(
          toast({
            message: t('posts.edit.error'),
            background: 'variant-filled-error',
          }),
        ),
      )
      .then(resetNewPostData)
      .then(close);
</script>

<ModalWrapper>
  <ModalHeader title={t('posts.edit.title')} />
  <div class=" max-h-[60vh] w-full overflow-y-scroll">
    <div class="w-full">
      {#if postData?.type === 'note'}
        <NoteForm {postData} {onchange} bind:valid />
      {:else if postData?.type === 'question'}
        <PollForm {postData} {onchange} bind:valid />
      {/if}
      <PreviewLinks content={postData.data.content} />
      <Attachments postData={postData.data} />
    </div>
  </div>
  <ModalFooter extraClassNames="border-t-0">
    <div class="w-full">
      <div class="mx-2 flex w-full items-center justify-between">
        <PostInputActions postData={postData.data} />
      </div>
      <div class="my-2 w-full border-t border-neutral-300"></div>
      <div class="flex items-center justify-end gap-x-2">
        <Button
          title={t('posts.edit.submit')}
          variant="variant-filled-primary"
          action={handlePublish}
          disabled={!valid}
        >
          {t('posts.edit.submit')}
        </Button>
      </div>
    </div>
  </ModalFooter>
</ModalWrapper>
