<script lang="ts">
	import { Loader2, Music4 } from 'lucide-svelte';
	import type { MediaAttachment } from '@openpeeps/common/types';
	import { uploadMediaFileMutation } from '$lib/api';

	const uploadMediaFile = uploadMediaFileMutation();
	let isLoading = $state(false);
	interface Props {
		usage: string;
		description?: string;
		url?: string;
		classes?: string;
		text?: string;
		maxSizeKb?: number;
		showAltInput?: boolean;
		onchange: (attachment: MediaAttachment) => void;
	}

	let { usage, description = '', classes = '', onchange }: Props = $props();

	let fileInput: HTMLInputElement | undefined = $state();

	const onFileSelected = async () => {
		const file = fileInput?.files?.[0];
		isLoading = true;
		if (file) {
			await uploadMediaFile({ file, description: description, usage }).then(onchange);
		}
		isLoading = false;
	};
</script>

<button class="relative {classes}">
	<span class="flex size-full items-center">
		<span class="flex size-full flex-col items-center justify-center bg-cover">
			<span class="font-bold">
				<Music4 />
			</span>
		</span>
		{#if isLoading}
			<Loader2 class="ml-2 h-8 w-8 animate-spin" />
		{/if}
	</span>
	<input
		type="file"
		accept="audio/*"
		bind:this={fileInput}
		onchange={onFileSelected}
		class="absolute left-0 top-0 size-full cursor-pointer opacity-0"
	/>
</button>
