<script lang="ts">
  import type { PublicPost } from '@openpeeps/common/types';
  import Attachment from './Attachment.svelte';
  interface Props {
    post: PublicPost;
  }

  let { post }: Props = $props();
</script>

{#if post?.data?.attachments && post?.data.attachments.length > 0}
  <div
    class="mt-2 w-full place-items-center gap-1 overflow-hidden rounded-md {post
      ?.data.attachments.length > 1
      ? 'h-96 md:h-[486px]'
      : ''}
    {post?.data.attachments.length === 1
      ? ''
      : post?.data.attachments.length === 2
        ? 'grid grid-cols-2'
        : 'grid grid-cols-2 grid-rows-2'}
				"
    role="button"
    tabindex="0"
  >
    {#each post?.data.attachments as attachment, index}
      <Attachment {post} {attachment} {index} />
    {/each}
  </div>
{/if}
