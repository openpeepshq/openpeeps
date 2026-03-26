<script lang="ts">
  import { Loader } from '@openpeeps/ui';
  import type { QueryObserverResult } from '@tanstack/svelte-query';
  import AccessDenied from '../core/preview-link/AccessDenied.svelte';

  interface Props {
    fullScreen?: boolean;
    loadingMessage?: string;
    errorMessage?: string;
    accessDeniedMessage?: string;
    classes?: string;
    queries: QueryObserverResult<unknown, unknown>[];
    promises?: Promise<unknown>[];
    ignoreErrors?: boolean;
    children?: import('svelte').Snippet;
    loading?: import('svelte').Snippet;
    error?: import('svelte').Snippet;
  }

  let {
    fullScreen = false,
    loadingMessage = '',
    errorMessage = 'An error occurred.',
    classes = '',
    queries,
    promises,
    ignoreErrors = false,
    children,
    loading,
    error,
  }: Props = $props();
</script>

<Loader
  {fullScreen}
  {loadingMessage}
  {errorMessage}
  {classes}
  {queries}
  {promises}
  {ignoreErrors}
  {children}
  {loading}
>
  {#snippet error()}
    <AccessDenied {queries}/>
  {/snippet}
</Loader>
