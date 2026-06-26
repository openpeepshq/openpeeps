<script lang="ts">
	import type {
		StandardLonghandProperties,
		StandardProperties,
		StandardShorthandProperties
	} from 'csstype';
	import { styleToString, withMargin } from '../utils';
	import type { HTMLAttributes } from 'svelte/elements';
	interface $$Props extends Omit<HTMLAttributes<HTMLHeadingElement>, 'style'> {
		style?: StandardLonghandProperties & StandardProperties & StandardShorthandProperties;
		as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		m?: string;
		mx?: string;
		my?: string;
		mt?: string;
		mr?: string;
		mb?: string;
		ml?: string;
	}

	const { style, class: className, children, as = 'h1', ...restProps }: $$Props = $props();
</script>

<svelte:element
	this={as}
	style={styleToString({
		...withMargin({
			m: restProps.m,
			mx: restProps.mx,
			my: restProps.my,
			mt: restProps.mt,
			mr: restProps.mr,
			mb: restProps.mb,
			ml: restProps.ml
		}),
		...style
	})}
	class={className}
	{...restProps}
>
	{@render children?.()}
</svelte:element>
