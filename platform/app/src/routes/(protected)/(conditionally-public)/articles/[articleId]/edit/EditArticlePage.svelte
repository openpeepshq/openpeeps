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
  import {
    createPostMutation,
    deletePostMutation,
    getPostStore,
    updatePostMutation,
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

  let article = $derived(post.data as Article);

  const articleId = page.params.articleId;
  const postQuery = getPostStore(articleId);
  const updatePost = updatePostMutation({ id: articleId });
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
            data: { ...post.data, ...article },
          })
            .then((articlePost) => {
              return goto(`/posts/${articlePost.id}`);
            })
            .catch((err) => toast({ message: err.message, type: 'error' }));
        })
        .catch((err) => toast({ message: err.message, type: 'error' }));
    } else {
      await updatePost(article);

      await goto(`/posts/${post.id}`);
    }
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

<ArticleForm bind:postData={post as PostCreationData} isEdit bind:valid />
