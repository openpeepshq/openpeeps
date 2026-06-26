<script lang="ts">
	import type {
		StandardLonghandProperties,
		StandardProperties,
		StandardShorthandProperties
	} from 'csstype';
	import { styleToString } from '../utils';
	import type { HTMLAttributes } from 'svelte/elements';
	interface $$Props extends Omit<HTMLAttributes<HTMLParagraphElement>, 'style'> {
		style?: StandardLonghandProperties & StandardShorthandProperties & StandardProperties;
	}

	const { style, class: className, children, ...restProps }: $$Props = $props();

	const styleDefault = {
		fontSize: '14px',
		lineHeight: '24px',
		margin: '16px 0',
		...style
	};
</script>

<p style={styleToString(styleDefault)} {...restProps} class={className}>
	{@render children?.()}
</p>
