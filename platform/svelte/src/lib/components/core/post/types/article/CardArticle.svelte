<script lang="ts">
  import type { Article, PublicPost } from '@openpeeps/common/types';
  import { page } from '$app/state';

  interface Props {
    post: PublicPost;
  }

  const { post }: Props = $props();
  const article = $derived(post.data as Article);
</script>

<div class="hover:bg-surface-100 overflow-hidden rounded-md px-2 pt-2">
  <a href="{page.url.origin}/posts/{post.id}" class="flex flex-col gap-2">
    <span class="h-32">
      <img
        src={article.image || '/img/article-default.png'}
        alt={article?.title || article?.content}
        class="h-full w-full rounded-md object-cover"
      />
    </span>
    <span class="flex flex-col gap-1">
      <h3 class="truncate font-semibold">{article?.title}</h3>
    </span>
  </a>
</div>
