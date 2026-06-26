<script lang="ts">
	import type {
		StandardLonghandProperties,
		StandardProperties,
		StandardShorthandProperties
	} from 'csstype';
	import { styleToString } from '../utils';
	import type { HTMLAttributes } from 'svelte/elements';
	interface $$Props extends Omit<HTMLAttributes<HTMLHRElement>, 'style'> {
		style?: StandardLonghandProperties & StandardProperties & StandardShorthandProperties;
	}

	const { style, class: className, ...restProps }: $$Props = $props();

	const styleDefault = {
		width: '100%',
		border: 'none',
		borderTop: '1px solid #eaeaea',
		...style
	};
</script>

<hr style={styleToString(styleDefault)} {...restProps} class={className} />
