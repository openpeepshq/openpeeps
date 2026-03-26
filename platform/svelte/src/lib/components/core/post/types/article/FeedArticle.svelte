<script lang="ts">
  import { ArrowRight } from 'lucide-svelte';
  import { firstNWords } from '@openpeeps/common';
  import type { Article, PublicPost } from '@openpeeps/common/types';
  import { i18nContext } from '$lib/components/i18n';
  import { Button } from '@openpeeps/ui';
  import { OpenpeepsMarkdown } from '$lib/components/core/markdown';

  const { t } = i18nContext();
  interface Props {
    post: PublicPost;
  }

  let { post }: Props = $props();
  let article = $derived(post.data as Article);

  const previewContent = $derived(firstNWords(article.content, 50));
  const showReadMore = $derived(
    article.content && previewContent.length < article.content.length,
  );
</script>

<div class="flex w-full flex-col gap-2">
  {#if article.image}
    <img
      src={article.image}
      class="w-full object-cover"
      alt="image for {article.title}"
    />
  {/if}
  <div class="prose allpeep-markdown">
    <h3 class="h3">{article.title}</h3>
  </div>
  <div>
    <OpenpeepsMarkdown
      source="{previewContent}{showReadMore ? '...' : ''}"
      linkPreviewMode="none"
    />
  </div>
  {#if showReadMore}
    <div class="flex justify-end">
      <Button action="/posts/{post.id}" class="text-primary-500">
        {t('posts.article.readMore')}
        <ArrowRight class="inline-block size-4" />
      </Button>
    </div>
  {/if}
</div>
