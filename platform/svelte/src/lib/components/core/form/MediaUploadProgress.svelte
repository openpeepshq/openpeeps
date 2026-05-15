<script lang="ts">
	import { mediaProcessingProgress } from '$lib/api';
	import type { MediaAttachment } from '@openpeeps/common/types';
	import { formatRemainingDuration } from '$lib/utils';
	import { onDestroy } from 'svelte';

	interface Props {
		uploadPercent?: number;
		/** Linear ETA for the byte-transfer phase, in ms (see xhrRequest). */
		uploadEstimatedRemainingMs?: number;
		mediaAttachmentId?: string;
		isUploading?: boolean;
		onReady?: (attachment: MediaAttachment) => void;
		onFailed?: (error?: string) => void;
	}

	let {
		uploadPercent = 0,
		uploadEstimatedRemainingMs,
		mediaAttachmentId,
		isUploading = false,
		onReady,
		onFailed,
	}: Props = $props();

	let processingPercent = $state(0);
	let estimatedRemainingMs = $state<number | undefined>();
	let status = $state<'processing' | 'ready' | 'failed' | 'idle'>('idle');

	// Plain (non-reactive) locals — assigning to a `$state` value inside the
	// effect that also reads it would schedule a re-run, fire the cleanup
	// (unsubscribe) and then hit the no-op early-return, silently detaching
	// the subscriber from the SSE source.
	let processing: { subscribe: any; stop: () => void } | undefined;
	let lastNotifiedId: string | undefined;

	$effect(() => {
		if (!mediaAttachmentId) {
			processing?.stop();
			processing = undefined;
			lastNotifiedId = undefined;
			processingPercent = 0;
			estimatedRemainingMs = undefined;
			status = 'idle';
			return;
		}
		if (lastNotifiedId === mediaAttachmentId) return;
		lastNotifiedId = mediaAttachmentId;

		processing?.stop();
		const stream = mediaProcessingProgress(mediaAttachmentId);
		processing = stream;

		const unsubscribe = stream.subscribe((event: any) => {
			if (!event) return;
			estimatedRemainingMs = event.estimatedRemainingMs;
			status = event.mediaAttachment?.status ?? 'processing';
			if (status === 'ready') {
				processingPercent = 100;
				onReady?.(event.mediaAttachment);
			} else if (status === 'failed') {
				processingPercent = 0;
				onFailed?.(event.mediaAttachment?.error);
			} else {
				processingPercent = Math.min(95, Math.max(0, event.progressPercent ?? 0));
			}
		});

		return () => {
			unsubscribe();
		};
	});

	const displayPercent = $derived(
		// Upload phase shows real bytes-transferred percent (0-100). Processing
		// phase shows ETA-based percent capped server-side at 95% until the
		// worker finishes.
		isUploading ? Math.max(0, Math.min(100, uploadPercent)) : processingPercent,
	);

	const label = $derived(
		isUploading
			? 'Uploading'
			: status === 'ready'
				? 'Ready'
				: status === 'failed'
					? 'Failed'
					: 'Processing',
	);

	onDestroy(() => {
		processing?.stop();
	});
</script>

<div class="flex flex-col gap-1 w-full" data-testid="media-upload-progress">
	<div class="flex justify-between items-baseline text-xs">
		<span>{label}</span>
		<span>{Math.round(displayPercent)}%</span>
	</div>
	<div class="h-2 bg-surface-200 w-full rounded overflow-hidden">
		<div
			class="h-full bg-primary-500 transition-all duration-300"
			style="width: {displayPercent}%"
		></div>
	</div>
	{#if isUploading && uploadEstimatedRemainingMs !== undefined && uploadEstimatedRemainingMs > 1000}
		<span class="text-xs opacity-70"
			>~{formatRemainingDuration(uploadEstimatedRemainingMs)} remaining</span
		>
	{:else if !isUploading && status === 'processing' && estimatedRemainingMs !== undefined && estimatedRemainingMs > 1000}
		<span class="text-xs opacity-70"
			>~{formatRemainingDuration(estimatedRemainingMs)} remaining</span
		>
	{/if}
</div>
