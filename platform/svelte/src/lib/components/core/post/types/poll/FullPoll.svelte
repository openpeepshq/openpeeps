<script lang="ts">
  import type { PublicPost } from '@openpeeps/common/types';
  import { FullNote } from '$lib/components/core';

  interface Props {
    post: PublicPost;
  }

  let { post }: Props = $props();
</script>

<FullNote {post} />
