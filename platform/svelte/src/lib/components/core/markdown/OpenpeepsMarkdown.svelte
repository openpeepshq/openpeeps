<script lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown';
  import a from './elements/a.svelte';
  import p from './elements/p.svelte';
  import Mention from './elements/Mention.svelte';
  import Hashtag from './elements/Hashtag.svelte';
  import type { Component } from 'svelte';
  import { marked, type TokensList } from 'marked';
  import type { MentionWithProfile } from '@openpeeps/common/types';
  import { PreviewLink } from '$lib/components';
  import hashtag from './extensions/hashtag';
  import mention from './extensions/mention';
  import { emptyTokensList, extractLinks } from './utils';
  import { presetProps } from '$lib/utils';
  import type { Renderers } from './types';
  import { isEmail } from '../preview-link/helpers';

  interface Props {
    source?: string | TokensList;
    mentions?: MentionWithProfile[];
    renderers?: Record<string, Component>;
    linkPreviewMode?: 'prepend' | 'append' | 'inline' | 'none';
    newTab?: boolean | ((link: string) => boolean);
    isInline?: boolean;
    class?: string;
  }

  let {
    source,
    mentions = [],
    renderers = {},
    linkPreviewMode = 'none',
    newTab = false,
    isInline = false,
    class: additionalClass = '',
  }: Props = $props();

  const combinedRenderers = {
    link: newTab ? presetProps(a, { newTab }) : a,
    paragraph: p,
    mention: newTab ? presetProps(Mention, { newTab }) : Mention,
    hashtag: newTab ? presetProps(Hashtag, { newTab }) : Hashtag,
    ...renderers,
  } as unknown as Renderers;

  let tokens: TokensList = $derived(
    Array.isArray(source)
      ? source
      : source
        ? marked
            .use({
              extensions: [mention(mentions), hashtag()],
            })
            .lexer(source)
        : emptyTokensList,
  );
  let links: string[] = $derived(tokens.flatMap(extractLinks));
</script>

<div>
  {#if linkPreviewMode === 'prepend'}
    {#each links as link, index (index)}
      <PreviewLink url={link} />
    {/each}
  {/if}
  <div
    class="allpeep-markdown prose {additionalClass} prose-code:before:content-[''] prose-code:after:content-[''] break-words"
  >
    <SvelteMarkdown {isInline} source={tokens} renderers={combinedRenderers} />
  </div>
  {#if linkPreviewMode === 'append' && tokens.links}
    <div class="mt-4">
      {#each links as link, index (index)}
        {#if !isEmail(link)}
          <PreviewLink url={link} />
        {/if}
      {/each}
    </div>
  {/if}
</div>
