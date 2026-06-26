<script lang="ts">
	import { styleToString } from '../utils';
	import type { HTMLAttributes } from 'svelte/elements';
	interface $$Props extends HTMLAttributes<HTMLDivElement> {
		preview: string;
	}

	const renderWhiteSpace = (text: string) => {
		const maxLength = 150;
		if (text.length > maxLength) {
			throw new RangeError(
				`Input exceeds maximum length of ${maxLength} characters. A good practice is to keep this text under 90 characters.`
			);
		}
		const whiteSpaceCodes = '\xa0\u200C\u200B\u200D\u200E\u200F\uFEFF';
		return whiteSpaceCodes.repeat(maxLength - text.length);
	};

	const { preview = '', ...restProps }: $$Props = $props();
</script>

<div
	id="__svelte-email-preview"
	style={styleToString({
		display: 'none',
		overflow: 'hidden',
		lineHeight: '1px',
		opacity: 0,
		maxHeight: 0,
		maxWidth: 0
	})}
	{...restProps}
>
	{preview}
	<div>
		{renderWhiteSpace(preview)}
	</div>
</div>
