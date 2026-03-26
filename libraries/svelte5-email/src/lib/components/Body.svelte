<script lang="ts">
	import type {
		StandardLonghandProperties,
		StandardProperties,
		StandardShorthandProperties
	} from 'csstype';
	import { styleToString } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';
	interface $$Props extends Omit<HTMLAttributes<HTMLBodyElement>, 'style'> {
		style?: StandardLonghandProperties & StandardShorthandProperties & StandardProperties;
		children?: Snippet;
	}

	const { style, class: className, children, ...restProps }: $$Props = $props();
</script>

<body {...restProps} style={styleToString(style)} class={className}>
	{@render children?.()}
</body>
