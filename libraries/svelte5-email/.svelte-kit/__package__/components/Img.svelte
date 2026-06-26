<script lang="ts">
	import type {
		StandardLonghandProperties,
		StandardProperties,
		StandardShorthandProperties
	} from 'csstype';
	import { styleToString } from '../utils';
	import type { HTMLAttributes } from 'svelte/elements';
	interface $$Props extends Omit<HTMLAttributes<HTMLImageElement>, 'style'> {
		style?: StandardProperties & StandardLonghandProperties & StandardShorthandProperties;
		alt: string;
		src: string;
		width?: string;
		height?: string;
	}

	const {
		style,
		class: className,
		alt = '',
		src = '',
		width = '0',
		height = '0',
		...restProps
	}: $$Props = $props();
	const styleDefault = {
		display: 'block',
		outline: 'none',
		border: 'none',
		textDecoration: 'none',
		...style
	};
</script>

<img
	{alt}
	{src}
	{width}
	{height}
	style={styleToString(styleDefault)}
	{...restProps}
	class={className}
/>
