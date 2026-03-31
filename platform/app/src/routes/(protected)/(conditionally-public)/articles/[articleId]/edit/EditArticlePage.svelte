<script lang="ts">
  import { getPageHeaderStore } from '@openpeeps/svelte/stores';
  import { ArticleForm } from '@openpeeps/svelte/components';
  import type {
    Article,
    PostWithMeta,
    PostCreationData,
  } from '@openpeeps/common/types';
  import { TextButton } from '@openpeeps/ui';
  import { presetProps } from '@openpeeps/svelte/utils';
  import { updatePostMutation } from '@openpeeps/svelte/api';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { truncateText } from '@openpeeps/common/lib';

  interface Props {
    post: PostWithMeta;
  }

  let { post }: Props = $props();

  let article = $derived(post.data as Article);

  const articleId = page.params.articleId;
  const updatePost = updatePostMutation({ id: articleId });

  const handleSubmit = async () => {
    const result = await updatePost(post);

    await goto(`/posts/${result.id}`);
  };

  let valid = $state(false);

  getPageHeaderStore().set({
    title: `Edit article ${truncateText(article.title)}`,
    actions: presetProps(TextButton, {
      action: handleSubmit,
      variant: 'variant-filled-primary',
      text: 'Update article',
    }),
  });
</script>

<ArticleForm bind:postData={post as PostCreationData} isEdit={false} bind:valid />
