<script lang="ts">
	import { getBreadcrumbsStore } from '$lib/stores';
	import Crumb from './Crumb.svelte';

	const breadcrumbs = getBreadcrumbsStore();
</script>

{#if $breadcrumbs.length > 0}
	<ol class="breadcrumb mb-3">
		{#each $breadcrumbs as crumb, index (index)}
			{#if index > 0}
				<li class="crumb-separator" aria-hidden="true">&rsaquo;</li>
			{/if}
			<Crumb {crumb} />
		{/each}
	</ol>
{/if}
