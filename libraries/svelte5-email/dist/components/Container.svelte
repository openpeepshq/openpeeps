<script lang="ts">
	import type {
		StandardLonghandProperties,
		StandardProperties,
		StandardShorthandProperties
	} from 'csstype';
	import { styleToString } from '../utils';
	import type { HTMLAttributes } from 'svelte/elements';

	interface $$Props extends Omit<HTMLAttributes<HTMLDivElement>, 'style' | 'class'> {
		style?: StandardLonghandProperties & StandardProperties & StandardShorthandProperties;
		class?: string | undefined;
	}

	const { style, class: className, children, ...restProps }: $$Props = $props();
	const styles = { ...style };
	const inlineStyle = styleToString(styles);
</script>

<div>
	{@html `<!--[if mso | IE]>
        <table role="presentation" width="100%" align="center" style="${inlineStyle}" class="${className}"><tr><td></td><td style="width:37.5em;">
      <![endif]-->`}
</div>
<div {...restProps} style={inlineStyle} class={className}>
	{@render children?.()}
</div>
<div>
	{@html `<!--[if mso | IE]>
        </td><td></td></tr></table>
        <![endif]-->`}
</div>
