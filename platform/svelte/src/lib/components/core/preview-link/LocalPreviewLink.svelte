<script lang="ts">
  import { isJamPath, isPostPath, isGroupPath } from './helpers';
  import PostPreview from './local/PostPreview.svelte';
  import JamPreview from './local/JamPreview.svelte';
  import GroupPreview from './local/GroupPreview.svelte';
  import { Button } from '@openpeeps/ui';
  interface Props {
    url: string;
  }

  let { url }: Props = $props();

  const path = new URL(url).pathname;

  const isPost = isPostPath(path);
  const isJam = isJamPath(path);
  const isGroup = isGroupPath(path);
</script>

<Button action={url}>
  <div class="card w-full p-3">
    {#if isPost}
      <PostPreview {path} />
    {:else if isGroup}
      <GroupPreview {path} />
    {:else if isJam}
      <JamPreview {path} />
    {/if}
  </div>
</Button>
