<script lang="ts">
	interface Props {
		extraClassNames?: string;
		children?: import('svelte').Snippet;
	}

	let { extraClassNames = '', children }: Props = $props();
</script>

<footer
	class="modal-footer sticky bottom-0 flex items-center justify-between border-t-[1px] border-surface-300 bg-surface-50 px-4 py-2 {extraClassNames}"
>
	{@render children?.()}
</footer>
