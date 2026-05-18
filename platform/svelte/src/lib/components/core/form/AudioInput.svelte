<script lang="ts">
	import { Loader2, Music4 } from 'lucide-svelte';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import type { MediaAttachment } from '@openpeeps/common/types';
	import { uploadMediaWithProgress } from '$lib/api';
	import { i18nContext } from '$lib/components/i18n';
	import { toast } from '$lib/utils';
	import MediaUploadProgress from './MediaUploadProgress.svelte';
	import { onDestroy } from 'svelte';

	const { t } = i18nContext();
	const toastStore = getToastStore();

	let isLoading = $state(false);
	let uploadPercent = $state(0);
	let uploadEstimatedRemainingMs = $state<number | undefined>(undefined);
	let isUploading = $state(false);
	let pendingMediaId = $state<string | undefined>(undefined);
	let uploadController: { abort: () => void } | undefined = $state();

	const showUploadFailedToast = (reason?: string) => {
		toastStore.trigger(
			toast({
				message: reason
					? t('form.upload.failedWithReason', { reason })
					: t('form.upload.failed'),
				background: 'variant-filled-error',
			}),
		);
	};

	const resetUploadState = () => {
		pendingMediaId = undefined;
		isUploading = false;
		uploadPercent = 0;
		uploadEstimatedRemainingMs = undefined;
		isLoading = false;
	};

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
		if (!file) return;
		uploadController?.abort();
		uploadPercent = 0;
		isUploading = true;
		pendingMediaId = undefined;
		isLoading = true;

		const handle = uploadMediaWithProgress({ file, description, usage });
		uploadController = { abort: handle.abort };
		const unsubscribePercent = handle.uploadPercent.subscribe((p) => {
			uploadPercent = p;
		});
		const unsubscribeEta = handle.uploadEstimatedRemainingMs.subscribe(
			(ms) => {
				uploadEstimatedRemainingMs = ms;
			},
		);
		const unsubscribeAttachment = handle.attachment.subscribe((a) => {
			if (a) {
				pendingMediaId = a.id;
				isUploading = false;
				if (a.status === 'ready') {
					onchange(a);
				}
			}
		});

		try {
			await handle.promise;
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				// user-initiated, no toast
			} else {
				showUploadFailedToast(error instanceof Error ? error.message : undefined);
				resetUploadState();
			}
		} finally {
			uploadController = undefined;
			unsubscribePercent();
			unsubscribeEta();
			unsubscribeAttachment();
			isLoading = false;
		}
	};

	const onMediaReady = (attachment: MediaAttachment) => {
		pendingMediaId = undefined;
		onchange(attachment);
	};

	const onMediaFailed = (error?: string) => {
		showUploadFailedToast(error);
		resetUploadState();
	};

	onDestroy(() => {
		uploadController?.abort();
	});
</script>

<button class="relative {classes}">
	<span class="flex size-full items-center">
		<span class="flex size-full flex-col items-center justify-center bg-cover">
			<span class="font-bold">
				<Music4 />
			</span>
		</span>
		{#if isLoading && !isUploading && !pendingMediaId}
			<Loader2 class="ml-2 h-8 w-8 animate-spin" />
		{/if}
	</span>
	{#if isUploading || pendingMediaId}
		<div class="absolute bottom-0 left-0 right-0 p-2 bg-surface-100/90">
			<MediaUploadProgress
				{uploadPercent}
				{uploadEstimatedRemainingMs}
				{isUploading}
				mediaAttachmentId={pendingMediaId}
				onReady={onMediaReady}
				onFailed={onMediaFailed}
			/>
		</div>
	{/if}
	<input
		type="file"
		accept="audio/*"
		bind:this={fileInput}
		onchange={onFileSelected}
		class="absolute left-0 top-0 size-full cursor-pointer opacity-0"
	/>
</button>
