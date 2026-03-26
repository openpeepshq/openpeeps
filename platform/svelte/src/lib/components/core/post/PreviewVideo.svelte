<script lang="ts">
	import type { MediaAttachmentData } from '@openpeeps/common';
	import { stopPropagation } from '@openpeeps/ui';
	import { Play } from 'lucide-svelte';

	interface Props {
		attachment?: MediaAttachmentData;
		attachmentsLength: number;
	}

	let { attachment, attachmentsLength = 1 }: Props = $props();

	let playClicked = $state(false);
</script>

{#if playClicked}
	<video
		controls
		src={attachment?.url}
		class="h-full w-full {attachmentsLength > 1 ? 'object-cover' : 'object-contain'}"
		autoplay
	>
		<track kind="captions" />
	</video>
{:else}
	<div class="relative h-full w-full">
		<div class="absolute left-0 top-0 flex h-full w-full items-center justify-center p-2">
			<button
				title="Play Video"
				onclick={stopPropagation(() => (playClicked = true))}
				class="bg-surface-50 z-30 flex size-24 cursor-pointer items-center justify-center rounded-full"
			>
				<Play size={40} />
			</button>
		</div>
		<video
			src={attachment?.previewUrl}
			class="h-full w-full {attachmentsLength > 1 ? 'object-cover' : 'object-contain'}"
		>
			<track kind="captions" />
		</video>
	</div>
{/if}
