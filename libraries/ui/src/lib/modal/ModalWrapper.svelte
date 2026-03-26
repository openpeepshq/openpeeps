<script lang="ts">
	interface Props {
		extraClassNames?: string;
		width?: string;
		children?: import('svelte').Snippet;
	}

	let { extraClassNames = '', width = 'w-modal', children }: Props = $props();
</script>

<div class="card bg-surface-50 max-h-[90vh] overflow-y-auto shadow-xl {extraClassNames} {width}">
	{@render children?.()}
</div>
