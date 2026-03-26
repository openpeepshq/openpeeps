<script lang="ts">
  import AnimatedEmoji from './AnimatedEmoji.svelte';
  import { ownReactionsStore } from '$lib/components/core/jams/stores';
</script>

{#each $ownReactionsStore as reaction (reaction.id)}
  <AnimatedEmoji emoji={reaction.content ?? ''} />
{/each}
