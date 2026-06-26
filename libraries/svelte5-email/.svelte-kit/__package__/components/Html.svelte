<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	interface $$Props extends Omit<HTMLAttributes<HTMLHtmlElement>, 'style'> {
		lang?: string;
		children?: Snippet;
	}

	const { lang = 'en', children, ...restProps }: $$Props = $props();
</script>

<html {...restProps} id="__svelte-email" {lang}>
	{@render children?.()}
</html>
