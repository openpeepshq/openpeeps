<script lang="ts">
  import { getNewPostStores, getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { ArticleForm } from '@openpeeps/svelte/components';
  import { type PostCreationData } from '@openpeeps/common/types';
  import { TextButton } from '@openpeeps/ui';
  import { presetProps } from '@openpeeps/svelte/utils';
  import { createPostMutation } from '@openpeeps/svelte/api';
  import { goto } from '$app/navigation';
  import { toaster } from '@openpeeps/svelte/utils';

  const createPost = createPostMutation();
  const toast = toaster();

  const newPostStores = getNewPostStores();
  let articleCreationData: PostCreationData = newPostStores.article;
  let isValid = $state(false);

  const handleSubmit = async () =>
    createPost(articleCreationData)
      .then((articlePost) => {
        newPostStores.resetNewArticleState();
        return goto(`/posts/${articlePost.id}`);
      })
      .catch((err) => toast({ message: err.message, type: 'error' }));

  $effect(() => {
    getPageHeaderStore().set({
      actions: presetProps(TextButton, {
        action: handleSubmit,
        variant: 'variant-filled-primary',
        text: 'Create article',
        disabled: !isValid,
      }),
    });
  });

  const onchange = (data: PostCreationData) => {
    newPostStores.article = data;
  };
</script>

<div class="pb-12">
  <ArticleForm
    bind:postData={articleCreationData}
    {onchange}
    bind:valid={isValid}
  />
</div>
