<script lang="ts">
  import { Loader, preventDefault, stopPropagation } from '@openpeeps/ui';
  import { linkPreviewQuery } from '$lib/api';
  interface Props {
    url: string;
  }

  let { url }: Props = $props();

  let linkPreview = linkPreviewQuery(url);
  let showPreview = true;
</script>

<Loader queries={[$linkPreview]}>
  <a
    href={url}
    onclick={stopPropagation(preventDefault(() => window.open(url, '_blank')))}
    class="w-full no-underline"
  >
    <div class="card w-full">
      {#if url && showPreview && $linkPreview.data}
        <div class="flex w-full flex-row items-center gap-4 p-2">
          {#if $linkPreview.data.data.image}
            <div
              class="flex h-32 w-32 flex-shrink-0 items-center justify-center"
            >
              <img
                src={$linkPreview.data.data.image}
                alt={$linkPreview.data.data.title}
                class="h-full w-full rounded-md object-cover object-center"
              />
            </div>
          {/if}
          <div
            class="flex w-32 flex-1 flex-col items-start justify-start gap-y-3"
          >
            <div class="w-fit">
              <p class="text-surface-800 text-sm font-thin sm:text-xs">
                {new URL(url).hostname}
              </p>
            </div>
            <div class="w-fit font-bold">
              <p class="font-bold">
                {$linkPreview.data.data.title ?? ''}
              </p>
            </div>
            <div class="text-surface-800 w-full truncate text-sm font-thin">
              {$linkPreview.data.data.description ?? ''}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </a>
  {#snippet error()}{/snippet}
</Loader>
