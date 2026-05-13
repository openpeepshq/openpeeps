<script lang="ts">
	import { Button } from '@openpeeps/ui';
	import { centerCropToAspectRatio, convertToWebpIfHeic } from '$lib/utils';

	interface Props {
		title: string;
		name: string;
		onChange: (event: Event) => Promise<void>;
		cropAspectRatio?: string;
	}

	let { title, name, onChange, cropAspectRatio = undefined }: Props = $props();

	let inputRef = $state<HTMLInputElement>();

	const parseAspectRatio = (ratio: string): { w: number; h: number } | undefined => {
		const parts = ratio.split(':').map((p) => Number.parseFloat(p.trim()));
		if (parts.length !== 2 || !parts.every((n) => Number.isFinite(n) && n > 0)) {
			return undefined;
		}
		return { w: parts[0]!, h: parts[1]! };
	};

	const handleChange = async (event: Event) => {
		const input = event.currentTarget as HTMLInputElement;
		const raw = input.files?.item(0);
		if (!raw) {
			return;
		}
		if (!raw.type.startsWith('image/')) {
			await onChange(event);
			input.value = '';
			return;
		}

		const aspect = cropAspectRatio ? parseAspectRatio(cropAspectRatio) : undefined;
		if (!aspect) {
			await onChange(event);
			input.value = '';
			return;
		}

		try {
			const normalized = await convertToWebpIfHeic(raw);
			const cropped = await centerCropToAspectRatio(normalized, aspect.w, aspect.h);
			const dt = new DataTransfer();
			dt.items.add(cropped);
			input.files = dt.files;
			await onChange({ currentTarget: input, target: input } as unknown as Event);
		} finally {
			input.value = '';
		}
	};
</script>

<Button {title} variant="variant-ringed-primary" action={() => inputRef?.click()}>
	{title}
</Button>
<input
	type="file"
	{name}
	accept="image/*"
	class="hidden border-2 border-dashed border-primary-500"
	onchange={handleChange}
	bind:this={inputRef}
/>
