<script lang="ts">
	import type {
		StandardLonghandProperties,
		StandardProperties,
		StandardShorthandProperties
	} from 'csstype';
	import { styleToString } from '../utils';
	import type { HTMLAttributes } from 'svelte/elements';
	interface $$Props extends Omit<HTMLAttributes<HTMLAnchorElement>, 'style'> {
		style?: StandardLonghandProperties & StandardShorthandProperties & StandardProperties;
		target?: string;
		href: string;
	}

	const {
		style,
		class: className,
		href = '',
		target = '_blank',
		children,
		...restProps
	}: $$Props = $props();

	const styleDefault = {
		color: '#067df7',
		textDecoration: 'none',
		...style
	};
</script>

<a {...restProps} {href} {target} style={styleToString(styleDefault)} class={className}>
	{@render children?.()}
</a>
