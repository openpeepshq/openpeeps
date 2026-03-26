<script lang="ts">
  import type { PublicPost } from '@openpeeps/common/types';
  import FeedArticle from './FeedArticle.svelte';

  interface Props {
    post: PublicPost;
  }

  let { post }: Props = $props();
</script>

<FeedArticle {post} />
